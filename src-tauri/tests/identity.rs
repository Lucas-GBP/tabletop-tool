use tabletop_tool_lib::domain::{Campaign, Scene};

fn test_scene() -> Scene {
    Scene::new("Scene", "Level 1").unwrap()
}

fn campaign(initial_scene: &Scene) -> Campaign {
    Campaign::new("Campaign", "Session 1", initial_scene).unwrap()
}

#[test]
fn persistent_entities_receive_distinct_uuid_identities() {
    let scene = test_scene();
    let other_scene = test_scene();
    let campaign = campaign(&scene);
    let session = &campaign.sessions()[0];
    let association = &session.scenes()[0];
    let level = &scene.levels()[0];

    assert!(!scene.id().as_uuid().is_nil());
    assert!(!other_scene.id().as_uuid().is_nil());
    assert_ne!(scene.id(), other_scene.id());
    assert!(!campaign.id().as_uuid().is_nil());
    assert!(!session.id().as_uuid().is_nil());
    assert!(!association.id().as_uuid().is_nil());
    assert!(!level.id().as_uuid().is_nil());
}
