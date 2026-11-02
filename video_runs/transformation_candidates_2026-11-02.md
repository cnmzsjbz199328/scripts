# 2D Battle Transformation Candidates — 2026-11-02

Google Flow project: [Sep 04, 06:13 PM](https://flow.google.com/project/b8c063ee-a5a5-4741-9b49-e4f462b2d80c)

## Accepted

### Water God v7

- Accepted video: water/source/flow_transform_2026-11-02/water_god_transformation_accepted_v7.mp4
- Flow: [Water God costume transformation v7](https://flow.google.com/project/b8c063ee-a5a5-4741-9b49-e4f462b2d80c/edit/c69c6eed-c0af-43bd-ab3d-355c8204c49e)
- Visual change: original navy coat becomes layered ocean-blue/turquoise panels with silver trim and wave motifs; the long blue hair and face remain recognizable. The final guard keeps the transformed outfit.
- Review: sampled at 0, 0.5, 1, 2, 2.5, 3, 4.5 and 5.75 seconds. Full figure and sword remain inside frame. A large but localized cyan-white slash arc appears during the cut; it does not reach the frame edges.
- SHA-256: F890E5DCCC3DB5552FA20E8366A7434A1D01684AE7256D65D3369282908A5578
- Review images: water/source/flow_transform_2026-11-02/water_v7_before_after.png, water/source/flow_transform_2026-11-02/water_v7_final_pose.png

## Current North God candidate

### North God v6

- Prompt: north/source/flow_transform_2026-11-02/prompt_flow_v6.txt
- Review: north/source/flow_transform_2026-11-02/review_v6.json
- Flow: [North God costume transformation v6](https://flow.google.com/project/b8c063ee-a5a5-4741-9b49-e4f462b2d80c/edit/2b6534b8-8b06-4aa7-a928-ef910db1e2cb)
- Head review: sampled every 0.5 seconds from 0 to 5.5 seconds. Head direction stays consistent with the opening reference; no clear independent turn or gaze shift is visible.
- Scale review: full-frame contact sheet confirms the figure remains near source scale through the middle and final guard; no uncontrolled enlargement is visible.
- SHA-256: 6FBB898984784DD76D098FD9E28DFB0D1F015B4739015401DF5DDE2BE6065BC1
- Review sheets: north/source/flow_transform_2026-11-02/north_v6_review_strip_0-5.5s.png, north/source/flow_transform_2026-11-02/north_v6_head_review_strip_0-5.5s.png
- Visual change: striped tunic becomes a fitted midnight-blue/charcoal coat with silver-white shoulder mantle, silver trim and chest fasteners. White hair and face, red trousers, both swords and sandals remain.
- Archived video: north/source/flow_transform_2026-11-02/north_god_transformation_candidate_v6.mp4

## Superseded / backup candidates

- North God v5: north/source/flow_transform_2026-11-02/north_god_transformation_candidate_v5.mp4; scale issue improved, but the user identified unwanted head turning. Superseded by v6.
- North God v4: north/source/flow_transform_2026-11-02/north_god_transformation_candidate_v4.mp4; costume change and footwear pass, but the character visibly scales up through the middle of the clip. Superseded for scale stability; retained as backup.
- North God v3: north/source/flow_transform_2026-11-02/north_god_transformation_candidate_v3.mp4; its coat transformation is clear, but small shoe-like shapes detach briefly around 1 second. Preserved as a backup; see review_v3.json.
- North God v2 and Water God v6: earlier movement-focused candidates remain archived with their prompts and reviews. Their clothes did not transform.
- Water God v5 remains excluded because water effects spread across most of the frame.

## Generation settings and source constraints

Water v7 and North v3–v6 use Omni 1.1 Flash, 16:9, 720p, 6 seconds, 24 fps, one output each. Each uses only its own padded character reference as the exact opening frame; no end frame and no other image/video input were selected. Flow showed 10 credits per generation. Water v7 is user-accepted; North v6 is archived and passes the head-orientation and scale review; it remains a candidate pending user acceptance.