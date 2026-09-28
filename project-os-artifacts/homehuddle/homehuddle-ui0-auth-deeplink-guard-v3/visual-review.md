# Visual review — HomeHuddle auth deep-link and web sign-out R3

Candidate `85bfb6fab92d3a9793ef3f1029fbd18256ee8d12` (tree `5696f4ff70b3d4d1f2962de9173d195af4f19b83`) was captured in fresh Chromium contexts at `en-US` / `America/Chicago`.
The web confirmation is a centered white dialog over a full-screen dim backdrop. At 390×844 both buttons fit comfortably and the body wraps cleanly; at 1440×900 the dialog remains centered with no clipping. The destructive action is visible and clearly labeled. Chromium reports `role="dialog"`, `aria-modal="true"`, an accessible dialog label, and focus on Cancel. A hit-test at an underlying Profile control resolves inside the modal, so the page cannot receive click-through.

Cancel leaves `/profile` authorized, makes no sign-out call, and the pre-open and post-Cancel Profile screenshots are byte-identical at both viewports. Escape also dismisses by cancellation and leaves Profile authorized. Confirm routes to `/login`; no Product snapshot was observed after confirmation, and browser back/forward stayed on `/login` with auth UI visible.

The `/login` composition after sign-out matches its fresh candidate composition at both anchors: logo and Apple-control boxes are identical before and after sign-out. R2’s exact predecessor screenshots and reports are referenced by SHA-256 and Git blob in `predecessor-evidence-hashes.json`; their bytes were reused in place and were not recaptured.

## R3 screenshots

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `profile-signout-confirm--desktop-1440x900.png` | 1440×900 | `8942ce59542f84eb6e438fe03c8277f2ad5957c3c0b58a367a1a61ee805753c0` |
| `profile-signout-confirm--mobile-390x844.png` | 390×844 | `1de6e2ce64cba2294b029b7b74f09ccd2f28708d9652cdea6beb35b0ac2210db` |
| `auth-login-after-signout--desktop-1440x900.png` | 1440×900 | `4f0a777cb2cf99152bc333ae2a78fc26bdb5e706d137a4bf70ec2ff33603c94a` |
| `auth-login-after-signout--mobile-390x844.png` | 390×844 | `09ce1e851ee2ae6263290d5223e4b85e85900428b73fffca340a44e3c2dac3e1` |
| `profile-closed-before--desktop-1440x900.png` | 1440×900 | `dc041af4a8c420c60508d9dd2c3e61312dd5e04a93bed78411a51bd304cd3e61` |
| `profile-closed-after-cancel--desktop-1440x900.png` | 1440×900 | `dc041af4a8c420c60508d9dd2c3e61312dd5e04a93bed78411a51bd304cd3e61` |
| `profile-closed-before--mobile-390x844.png` | 390×844 | `99bea019ae1dcdd4e1c8f7befa90ecf0ab31d94af0d2566acb12af2e9aec271d` |
| `profile-closed-after-cancel--mobile-390x844.png` | 390×844 | `99bea019ae1dcdd4e1c8f7befa90ecf0ab31d94af0d2566acb12af2e9aec271d` |

## Closed Profile pixel checks

| Viewport | Before Sign Out | After Cancel | Result |
| --- | --- | --- | --- |
| mobile-390x844 | `99bea019ae1dcdd4e1c8f7befa90ecf0ab31d94af0d2566acb12af2e9aec271d` | `99bea019ae1dcdd4e1c8f7befa90ecf0ab31d94af0d2566acb12af2e9aec271d` | byte-identical |
| desktop-1440x900 | `dc041af4a8c420c60508d9dd2c3e61312dd5e04a93bed78411a51bd304cd3e61` | `dc041af4a8c420c60508d9dd2c3e61312dd5e04a93bed78411a51bd304cd3e61` | byte-identical |

## R2 screenshots carried forward by exact reference

Source: `refs/heads/project-os-artifacts/homehuddle/homehuddle-ui0-auth-deeplink-guard-v2` at `25213fd890e3646893a2d2e5c1ae016169b3c19d`. No PNG was re-encoded or copied into the R3 package.

| File | Dimensions | SHA-256 | Git blob |
| --- | ---: | --- | --- |
| `app-home-after-bypass-desktop-1440x900.png` | 1440×900 | `add8d873609d47b4d63f0f7d6d5bccf0cb17432d0d831846f0d67ff0ca133999` | `fdfa689a6ec89fd289c189160099bd58b20a0122` |
| `app-home-after-bypass-mobile-390x844.png` | 390×844 | `a115eaa1f639e3e475db88fad2bc9fc019c7975094bb2df960d1c41480c9d980` | `188310c4d479cf284aaa5bccffa78ac44fc67449` |
| `auth-login-desktop-1440x900.png` | 1440×900 | `25e0d4e6ea76e023656e4e5669a2208a901fd3f2ec8e4a88235523c9dcb9726e` | `6dd11574b81b9e16cbdbd5366478ec3dee6f0485` |
| `auth-login-mobile-390x844.png` | 390×844 | `a8e244e38bc010731b23786c649521a99aaeea181a3b9b71dcf2d22ebd62e122` | `69464ad5bd1a334b7fe6687e5e744169812d497c` |
| `auth-root-desktop-1440x900.png` | 1440×900 | `37516d8679a09d0eeaf6aae601031940e8ec28beadd2d41aacfd1a99074b6ae2` | `a59025eaca835a6320686bd81f06d01322569f86` |
| `auth-root-mobile-390x844.png` | 390×844 | `07ab1c50ea0e0660d6aa76f0425f3168d594f126b935e5a7d4ea7157bec8d618` | `d0fe72cc1532d27aa2194c01fe09fbdf7dded7fa` |
| `guarded-chores-deeplink-desktop-1440x900.png` | 1440×900 | `0689ebcf8942b6d9e21589b8a1155bba6bfa1da1297e1c3ae341e9cb251505f1` | `db35956870b51a10a7538b9c34c444cd707a6767` |
| `guarded-chores-deeplink-mobile-390x844.png` | 390×844 | `15105777bcf7e38e9c34f81e7c9f1b5564c146129f1562aff552a959f075aed4` | `32f5466e3a96ceb333855f81b726ee0f70d39159` |

This package records evidence only. It does not grant GO. Native Alert runtime, VoiceOver, and TalkBack remain unproven.
