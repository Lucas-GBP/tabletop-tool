use tabletop_tool_lib::domain::{
    detach_scene_from_campaigns, Campaign, DomainError, Scene, SceneId, SceneLevelId,
};

fn positions(values: impl IntoIterator<Item = usize>) -> Vec<usize> {
    values.into_iter().collect()
}

#[test]
fn scene_starts_with_one_level_owned_by_it() {
    let scene = Scene::new();

    assert_eq!(scene.levels().len(), 1);
    assert_eq!(scene.levels()[0].scene_id(), scene.id());
    assert_eq!(scene.levels()[0].position(), 0);
}

#[test]
fn scene_level_insert_move_and_remove_keep_dense_positions() {
    let mut scene = Scene::new();
    let first = scene.levels()[0].id();
    let second = scene.add_level();
    let inserted = scene.insert_level(1).unwrap();

    assert_eq!(
        scene
            .levels()
            .iter()
            .map(|level| level.id())
            .collect::<Vec<_>>(),
        vec![first, inserted, second]
    );
    scene.move_level(second, 0).unwrap();
    assert_eq!(scene.levels()[0].id(), second);
    scene.remove_level(inserted).unwrap();
    assert_eq!(
        positions(scene.levels().iter().map(|level| level.position())),
        vec![0, 1]
    );
}

#[test]
fn scene_rejects_removing_its_last_level_without_mutation() {
    let mut scene = Scene::new();
    let level = scene.levels()[0].id();

    assert_eq!(
        scene.remove_level(level),
        Err(DomainError::CannotRemoveLastSceneLevel(scene.id()))
    );
    assert_eq!(scene.levels().len(), 1);
}

#[test]
fn scene_rejects_invalid_level_operations_without_mutation() {
    let mut scene = Scene::new();
    let level = scene.levels()[0].id();
    let snapshot = scene.clone();
    let missing = SceneLevelId::new();

    assert_eq!(
        scene.move_level(missing, 0),
        Err(DomainError::SceneLevelNotFound(missing))
    );
    assert_eq!(scene, snapshot);
    assert_eq!(
        scene.move_level(level, 1),
        Err(DomainError::PositionOutOfBounds {
            position: 1,
            len: 1
        })
    );
    assert_eq!(scene, snapshot);
    scene.move_level(level, 0).unwrap();
    assert_eq!(scene, snapshot);
    assert_eq!(
        scene.remove_level(missing),
        Err(DomainError::SceneLevelNotFound(missing))
    );
    assert_eq!(scene, snapshot);
    assert_eq!(
        scene.insert_level(2),
        Err(DomainError::PositionOutOfBounds {
            position: 2,
            len: 1
        })
    );
    assert_eq!(scene, snapshot);
}

#[test]
fn campaign_starts_with_one_session_using_the_explicit_scene() {
    let scene = Scene::new();
    let campaign = Campaign::new(&scene);

    assert_eq!(campaign.sessions().len(), 1);
    let session = &campaign.sessions()[0];
    assert_eq!(session.campaign_id(), campaign.id());
    assert_eq!(session.position(), 0);
    assert_eq!(session.scenes().len(), 1);
    assert_eq!(session.scenes()[0].session_id(), session.id());
    assert_eq!(session.scenes()[0].scene_id(), scene.id());
    assert_eq!(session.scenes()[0].position(), 0);
}

#[test]
fn campaign_session_insert_move_and_remove_keep_dense_positions() {
    let scene = Scene::new();
    let mut campaign = Campaign::new(&scene);
    let first = campaign.sessions()[0].id();
    let second = campaign.add_session(&scene);
    let inserted = campaign.insert_session(1, &scene).unwrap();

    assert_eq!(
        campaign
            .sessions()
            .iter()
            .map(|session| session.id())
            .collect::<Vec<_>>(),
        vec![first, inserted, second]
    );
    campaign.move_session(second, 0).unwrap();
    campaign.move_session(second, 2).unwrap();
    assert_eq!(campaign.sessions()[2].id(), second);
    campaign.remove_session(inserted).unwrap();
    assert_eq!(
        positions(campaign.sessions().iter().map(|session| session.position())),
        vec![0, 1]
    );
}

#[test]
fn campaign_rejects_invalid_session_positions_without_mutation() {
    let scene = Scene::new();
    let mut campaign = Campaign::new(&scene);
    let session = campaign.sessions()[0].id();
    let snapshot = campaign.clone();

    assert_eq!(
        campaign.insert_session(2, &scene),
        Err(DomainError::PositionOutOfBounds {
            position: 2,
            len: 1
        })
    );
    assert_eq!(campaign, snapshot);
    assert_eq!(
        campaign.move_session(session, 1),
        Err(DomainError::PositionOutOfBounds {
            position: 1,
            len: 1
        })
    );
    assert_eq!(campaign, snapshot);
    campaign.move_session(session, 0).unwrap();
    assert_eq!(campaign, snapshot);
}

#[test]
fn campaign_rejects_removing_its_last_session_without_mutation() {
    let scene = Scene::new();
    let mut campaign = Campaign::new(&scene);
    let session = campaign.sessions()[0].id();

    assert_eq!(
        campaign.remove_session(session),
        Err(DomainError::CannotRemoveLastSession(campaign.id()))
    );
    assert_eq!(campaign.sessions().len(), 1);
}

#[test]
fn removing_a_session_does_not_delete_its_reusable_scenes() {
    let scene = Scene::new();
    let mut campaign = Campaign::new(&scene);
    let removed_id = campaign.add_session(&scene);

    let removed = campaign.remove_session(removed_id).unwrap();

    assert!(removed.uses_scene(scene.id()));
    assert_eq!(scene.levels().len(), 1);
    assert!(campaign.uses_scene(scene.id()));
}

#[test]
fn deleting_a_scene_is_preflighted_across_all_campaigns() {
    let required = Scene::new();
    let alternative = Scene::new();
    let first = Campaign::new(&required);
    let mut second = Campaign::new(&required);
    let second_session = second.sessions()[0].id();
    second.add_scene(second_session, &alternative).unwrap();
    // Put the mutable candidate first so this catches streaming implementations
    // that change early campaigns before discovering a later blocker.
    let mut campaigns = vec![second, first];
    let snapshot = campaigns.clone();

    let error = detach_scene_from_campaigns(&mut campaigns, required.id()).unwrap_err();
    assert!(matches!(
        error,
        DomainError::SceneRequiredBySessions { scene_id, .. } if scene_id == required.id()
    ));
    assert_eq!(campaigns, snapshot);
}

#[test]
fn deleting_a_scene_detaches_all_associations_when_sessions_remain_valid() {
    let deleted = Scene::new();
    let alternative = Scene::new();
    let mut first = Campaign::new(&deleted);
    let first_session = first.sessions()[0].id();
    first.add_scene(first_session, &alternative).unwrap();
    let mut second = Campaign::new(&alternative);
    let second_session = second.sessions()[0].id();
    second.add_scene(second_session, &deleted).unwrap();
    let mut campaigns = vec![first, second];

    assert_eq!(
        detach_scene_from_campaigns(&mut campaigns, deleted.id()),
        Ok(2)
    );
    assert!(campaigns
        .iter()
        .all(|campaign| !campaign.uses_scene(deleted.id())));
    assert!(campaigns.iter().all(|campaign| campaign
        .sessions()
        .iter()
        .all(|session| session.scenes().len() == 1)));
}

#[test]
fn deleting_an_unreferenced_scene_is_a_noop() {
    let scene = Scene::new();
    let mut campaigns = vec![Campaign::new(&scene)];

    assert_eq!(
        detach_scene_from_campaigns(&mut campaigns, SceneId::new()),
        Ok(0)
    );
}
