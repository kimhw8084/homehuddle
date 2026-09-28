# Visual review — HomeHuddle auth deep-link guard R2

The auth entry remains the original `app/index.tsx` implementation. `/login` re-exports that same component; no auth UI or Product screen source was redesigned.

After the auth animations settled, the logo-trigger and Apple control had identical geometry at `/` and `/login`:

- 390×844: logo 120×120 at (135, 132.8); Apple label 179.5×21 at (105.2, 588).
- 1440×900: logo 120×120 at (660, 151); Apple label 179.5×21 at (630.2, 620.5).
- Geometry delta: 0 px for both controls at both sizes.

The auth background contains randomized animated orbs and a typewriter line, so those pixels can differ between fresh contexts. The auth layout and controls remain the same. The two guarded Chores deep-link screenshots show the auth UI at `/login`; the Home captures show the existing Product screen after explicit bypass. Home/Chores/Family/Wallet/Market/Restock source files were not changed.

## Captures

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `auth-root-desktop-1440x900.png` | 1440×900 | `37516d8679a09d0eeaf6aae601031940e8ec28beadd2d41aacfd1a99074b6ae2` |
| `auth-root-mobile-390x844.png` | 390×844 | `07ab1c50ea0e0660d6aa76f0425f3168d594f126b935e5a7d4ea7157bec8d618` |
| `auth-login-desktop-1440x900.png` | 1440×900 | `25e0d4e6ea76e023656e4e5669a2208a901fd3f2ec8e4a88235523c9dcb9726e` |
| `auth-login-mobile-390x844.png` | 390×844 | `a8e244e38bc010731b23786c649521a99aaeea181a3b9b71dcf2d22ebd62e122` |
| `guarded-chores-deeplink-desktop-1440x900.png` | 1440×900 | `0689ebcf8942b6d9e21589b8a1155bba6bfa1da1297e1c3ae341e9cb251505f1` |
| `guarded-chores-deeplink-mobile-390x844.png` | 390×844 | `15105777bcf7e38e9c34f81e7c9f1b5564c146129f1562aff552a959f075aed4` |
| `app-home-after-bypass-desktop-1440x900.png` | 1440×900 | `add8d873609d47b4d63f0f7d6d5bccf0cb17432d0d831846f0d67ff0ca133999` |
| `app-home-after-bypass-mobile-390x844.png` | 390×844 | `a115eaa1f639e3e475db88fad2bc9fc019c7975094bb2df960d1c41480c9d980` |

The captured routing delta is limited to `/login` and auth/deep-link routing. This report records evidence only and does not grant GO.
