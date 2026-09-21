use tabletop_tool_lib::domain::{Campaign, Scene};

#[test]
fn persistent_entities_receive_distinct_uuid_identities() {
    let scene = Scene::new();
    let other_scene = Scene::new();
    let campaign = Campaign::new(&scene);
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
