## Ecclesia Lab: Worship LIVE

Control [Worship LIVE](https://ecclesialab.co.kr/), the worship subtitle and presentation app for Mac.

Requires Worship LIVE 2.1 or later.

### Setup

**Worship LIVE on the same Mac as Companion**

Add the connection and leave the settings as they are. There is nothing to turn on in Worship LIVE and no password to enter. The connection turns green as soon as Worship LIVE is running.

**Worship LIVE on another computer**

1. In Worship LIVE open **Settings › Devices › Controller** (환경설정 › 기기연결 › 컨트롤러) and turn on **Use from another computer** (다른 컴퓨터에서 쓰기). The IP address (IP 주소), the port (포트) and the password (비밀번호) appear.
2. In Companion enter them as **Target IP**, **Target Port** and **Password**. The port is 7788 unless it was changed in Worship LIVE.

Both computers must be on the same network.

### Actions

| Action          | What it does                                                                 |
| --------------- | ---------------------------------------------------------------------------- |
| Next / Previous | Go to the next or the previous slide                                         |
| Part            | Jump to a part of the current song, such as a verse or the chorus            |
| Clear           | Clear subtitles, media, overlays, audio or everything                        |
| Blackout        | Toggle, turn on or turn off                                                  |
| Main Output     | Toggle, turn on or turn off                                                  |
| Prompter Output | Toggle, turn on or turn off                                                  |
| Scene           | Switch to one of your scenes                                                 |
| Prompter Layout | Switch the prompter layout                                                   |
| Overlay         | Toggle, show or hide an overlay                                              |
| Countdown       | Start / stop, start, stop or reset a countdown                               |
| Stage Message   | Send a message to the stage display, or clear it                             |
| Audio           | Play a track, pause and resume, or stop                                      |
| Playback        | Play, pause or skip the video or audio that is playing, or jump near its end |

Scenes, prompter layouts, overlays, countdowns, parts and audio tracks are read from Worship LIVE, so you choose them by name. Renaming one in Worship LIVE keeps your buttons working.

Next, Previous and Part do nothing while Worship LIVE is in edit mode, the same as its own keyboard shortcuts.

### Feedbacks

- Blackout is on
- Main output is on
- Prompter output is on
- Scene is in use
- Prompter layout is in use
- Overlay is shown
- Countdown is running
- Part is live
- Stage message is showing
- Video or audio is playing
- There is something to clear

### Variables

| Variable                                          | Value                                          |
| ------------------------------------------------- | ---------------------------------------------- |
| `connected`                                       | Whether Companion is connected to Worship LIVE |
| `version`                                         | Worship LIVE version                           |
| `scene`                                           | Name of the scene in use                       |
| `prompter_layout`                                 | Name of the prompter layout in use             |
| `part`                                            | Name of the part that is live                  |
| `overlays`                                        | Names of the overlays shown                    |
| `blackout`, `output`, `prompter_output`           | true or false                                  |
| `stage_message`, `video_playing`, `audio_playing` | true or false                                  |
| `countdown_<id>`                                  | Remaining time of a countdown, such as 04:59   |
| `countdown_<id>_seconds`                          | Remaining time of a countdown in seconds       |

There is one pair of countdown variables for each countdown in Worship LIVE. They are listed by name in the variable list.

### Presets

Ready-made buttons for everything above: slides, parts, clear, outputs, scenes, prompter layouts, overlays, countdowns (with the remaining time on the button), stage message, audio and playback. The buttons use the same pictures as Worship LIVE and light up with what is live.

The lists of scenes, prompter layouts, overlays, countdowns, parts and tracks appear once Worship LIVE is connected.
