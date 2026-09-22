use tabletop_tool_lib::domain::{Campaign, DomainError, Scene, SessionId};

fn test_scene() -> Scene {
    Scene::new("Scene", "Level 1").unwrap()
}

fn campaign(initial_scene: &Scene) -> Campaign {
    Campaign::new("Campaign", "Session 1", initial_scene).unwrap()
}

#[test]
fn a_scene_can_be_reused_by_multiple_sessions_and_campaigns() {
    let scene = test_scene();
    let mut first_campaign = campaign(&scene);
    let second_session = first_campaign.add_session("Session 2", &scene).unwrap();
    let second_campaign = campaign(&scene);

    assert!(first_campaign
        .sessions()
        .iter()
        .all(|session| session.uses_scene(scene.id())));
    assert!(first_campaign
        .sessions()
        .iter()
        .any(|session| session.id() == second_session));
    assert!(second_campaign.uses_scene(scene.id()));
}

#[test]
fn session_rejects_duplicate_scene_associations_without_mutation() {
    let scene = test_scene();
    let mut campaign = campaign(&scene);
    let session = campaign.sessions()[0].id();
    let snapshot = campaign.clone();

    assert_eq!(
        campaign.add_scene(session, &scene),
        Err(DomainError::SceneAlreadyAssociated {
            session_id: session,
            scene_id: scene.id()
        })
    );
    assert_eq!(campaign, snapshot);
}

#[test]
fn session_scene_insert_move_and_remove_keep_dense_positions() {
    let first = test_scene();
    let second = test_scene();
    let inserted = test_scene();
    let mut campaign = campaign(&first);
    let session = campaign.sessions()[0].id();
    campaign.add_scene(session, &second).unwrap();
    campaign.insert_scene(session, 1, &inserted).unwrap();

    campaign.move_scene(session, second.id(), 0).unwrap();
    campaign.move_scene(session, second.id(), 2).unwrap();
    campaign.remove_scene(session, inserted.id()).unwrap();

    let links = campaign.sessions()[0].scenes();
    assert_eq!(links[0].scene_id(), first.id());
    assert_eq!(links[1].scene_id(), second.id());
    assert_eq!(
        links.iter().map(|link| link.position()).collect::<Vec<_>>(),
        vec![0, 1]
    );
}

#[test]
fn session_rejects_removing_its_last_scene_without_mutation() {
    let scene = test_scene();
    let mut campaign = campaign(&scene);
    let session = campaign.sessions()[0].id();
    let snapshot = campaign.clone();

    assert_eq!(
        campaign.remove_scene(session, scene.id()),
        Err(DomainError::CannotRemoveLastScene(session))
    );
    assert_eq!(campaign, snapshot);

    let missing = test_scene();
    assert_eq!(
        campaign.remove_scene(session, missing.id()),
        Err(DomainError::SceneNotAssociated {
            session_id: session,
            scene_id: missing.id()
        })
    );
    assert_eq!(campaign, snapshot);
}

#[test]
fn moving_a_scene_preserves_the_association_identity() {
    let first = test_scene();
    let second = test_scene();
    let mut campaign = campaign(&first);
    let session = campaign.sessions()[0].id();
    let association = campaign.add_scene(session, &second).unwrap();

    campaign.move_scene(session, second.id(), 0).unwrap();

    assert_eq!(campaign.sessions()[0].scenes()[0].id(), association);
}

#[test]
fn operations_reject_unknown_sessions_without_mutation() {
    let scene = test_scene();
    let other = test_scene();
    let mut campaign = campaign(&scene);
    let missing = SessionId::new();
    let snapshot = campaign.clone();

    assert_eq!(
        campaign.add_scene(missing, &other),
        Err(DomainError::SessionNotFound(missing))
    );
    assert_eq!(campaign, snapshot);
    assert_eq!(
        campaign.remove_session(missing),
        Err(DomainError::SessionNotFound(missing))
    );
    assert_eq!(campaign, snapshot);
}

#[test]
fn invalid_scene_position_is_rejected_before_mutation() {
    let first = test_scene();
    let second = test_scene();
    let mut campaign = campaign(&first);
    let session = campaign.sessions()[0].id();
    let snapshot = campaign.clone();

    assert_eq!(
        campaign.insert_scene(session, 2, &second),
        Err(DomainError::PositionOutOfBounds {
            position: 2,
            len: 1
        })
    );
    assert_eq!(campaign, snapshot);
    assert_eq!(
        campaign.move_scene(session, first.id(), 1),
        Err(DomainError::PositionOutOfBounds {
            position: 1,
            len: 1
        })
    );
    assert_eq!(campaign, snapshot);
    campaign.move_scene(session, first.id(), 0).unwrap();
    assert_eq!(campaign, snapshot);
}
