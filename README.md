# The Code of Hammurabi: WebXR stele

This is a life-size Code of Hammurabi stele that middle schoolers can put in a real classroom using Quest 3 passthrough, or visit in a simple VR gallery. Students walk around it and select 8 numbered dots. Each dot shows a short reading, a quote from the laws, and a "Think about it" question.

It works in three places:

| Where | What happens |
|---|---|
| **Quest 3, "Put it in this room"** | Passthrough AR. Students point at the floor and pull the trigger or pinch to set the stele down, then walk around it. |
| **Quest 3, "Visit the VR gallery"** | The same stele in a dim virtual room. Use this if passthrough isn't available. |
| **Chromebook / computer** | Drag to orbit and click the dots. Info appears in a side card. |

Students don't sign in, and the app itself doesn't save or send any student data.

---

## 1. Put it on GitHub Pages (about 10 minutes)

1. Sign in at github.com and click **New repository**. Name it, for example, `hammurabi-xr`, set it to **Public**, and click **Create**.
2. On the new repo page, click **uploading an existing file**. Drag in **everything inside this folder**: `index.html`, `js/`, `vendor/`, `fonts/`, `models/`, `.nojekyll` and this README. Then click **Commit changes**.
   *Tip: if the `.nojekyll` file is hidden on your computer, it's OK to skip it.*
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and click **Save**.
4. After a minute or two, the page shows your link. It looks like
   `https://YOUR-USERNAME.github.io/hammurabi-xr/`

> **iboss:** make sure `YOUR-USERNAME.github.io` is allowed on the network the headsets use.

## 2. Test on one headset first

1. On a Quest 3, open the **Meta Quest Browser** and go to your link.
2. Tap **Put it in this room**. Allow the permission prompt if one appears.
3. Point at the floor and pull the trigger (or pinch) to set the stele down.

If you see the stele standing in your room, the content side is done.

## 3. Add it to ArborXR

1. In ArborXR, go to **Content Library → Add Content → WebXR Link**. Paste your GitHub Pages link and give it a title, for example "Code of Hammurabi".
2. Assign it to your headset group under the **Devices** tab.
3. Students launch it from ArborXR Home.

### Which browser opens it (important)

ArborXR recommends installing the **Wolvic** browser (as an APK, hidden from Home). WebXR links then open in a locked-down kiosk window, so students can't type in the address bar. ArborXR also notes that on newer Quest OS versions, the built-in Quest Browser may not be able to enter immersive mode when ArborXR launches a link.

What still needs testing: Wolvic added WebXR AR support in its **Chromium-based** build. ArborXR's guide recommends the **Gecko-based** build, and I couldn't confirm passthrough support for either build on Quest 3. So on one headset, try:

1. **Wolvic (Chromium build)** launched from ArborXR. Does the **Put it in this room** button light up?
2. If not, try **Wolvic (Gecko build)**.
3. If neither does passthrough, **Visit the VR gallery** still works in Wolvic. For passthrough, students can open the link in the Quest Browser directly, for example from a bookmark.

The page checks what the browser supports. If passthrough isn't available, that button is greyed out and a message explains why.

## 4. Classroom tips

- **Space:** a life-size stele is 2.25 m (7½ ft) tall. Give each student about 2 × 2 m of clear floor to walk around it. In a tight room, press **Table size** and set a small one on a desk.
- **Controls:** the floating toolbar has *Turn ‹ / Turn ›*, *Table size / Life size*, *Move*, *Hide dots* and *Exit*. The right thumbstick also turns the stele. Hand tracking works: pinch to select.
- **Dots on the back:** dots 5, 6 and 7 are on the back of the stone, so students have to walk around it. That's on purpose.

## 5. Editing

| To change… | Edit |
|---|---|
| Hotspot text, quotes, questions, or where the dots sit | `js/content.js` (plain text, with comments explaining each field) |
| The 3D model, its size, or the table-size scale | `js/config.js` |

After editing, upload the changed file to GitHub again. Headsets get the new version the next time they open the link. You might need to reload once.

## 6. Swapping in a real 3D scan

The stele in this build is a **stand-in**: the relief and cuneiform are decorative, not copied from the real stone. To use a real scan:

1. Download a scan as **.glb** (best) or **.stl**. The *Scan The World* scan of the Louvre stele on MyMiniFactory is one option. Check the model's license on its page before using it.
2. **Keep it light.** Quest browsers struggle with files over about 15 MB. Reduce the polygon count first, for example with Blender's *Decimate* modifier or by exporting a lower-detail mesh, to around 100k–300k triangles.
3. Put the file in `models/` and set `modelUrl: 'models/yourfile.glb'` in `js/config.js`.
4. If it loads lying down, set `modelUpAxis: 'z'`. If the relief faces sideways or backwards, set `modelRotationDeg` to `90`, `-90` or `180`.

The dots find the stone's surface automatically, so they still land on the right sides.

**Quick test without editing anything:** add settings to the end of the link, for example
`…/hammurabi-xr/?model=models/yourfile.stl&up=z&rot=180`

**Other link option:** `?quality=low` uses smaller textures, if a headset feels sluggish.

## Credits

- Built with [three.js](https://threejs.org) (MIT license, included in `vendor/`).
- Cuneiform signs drawn with Noto Sans Cuneiform (SIL Open Font License, included in `fonts/`).
- Law quotations: L. W. King's 1915 English translation (public domain).
- Facts about the stele come from the Louvre's page on the Code of Hammurabi and the Wikipedia article "Code of Hammurabi".
