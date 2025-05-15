import type { Utils } from "./utils.js";
import type { Layer, LayerGroup } from "./layer.js";
import type { Easing } from "./easing.js";
import type { InputTracker } from "./inputTracker.js";
import type { TimeManager, Timer } from "./timeManager.js";
import type { TextManager } from "./textManager.js";
import type { ResourceManager, GenericResource, ImageResource, AudioResource, FontResource } from "./resourceManager.js";
import type { MaterialManager, Material } from "./materialManager.js";
import type { AudioManager, Sound } from "./audioManager.js";
import type { GooballManager, Gooball, GooballEye } from "./gooballManager.js";
import type { PipeManager, Pipe } from "./pipeManager.js"
import type { IslandManager, Island, IslandLevel } from "./islandManager.js";
import type { LevelManager, Level, Camera, CameraKeyframe, GenericBody, RectBody, CircleBody, Strand, LevelButton } from "./levelManager.js";
import type { Canvas, CanvasButton } from "./canvas.js";
import type { ProfileManager, Profile, LevelProfile } from "./profileManager.js";

declare global {
    interface Window {
        game: {
            Classes: {
                Layer: typeof Layer,
                LayerGroup: typeof LayerGroup,
                Easing: typeof Easing,

                InputTracker: typeof InputTracker,

                TimeManager: typeof TimeManager,
                Timer: typeof Timer,

                TextManager: typeof TextManager,

                ResourceManager: typeof ResourceManager,
                GenericResource: typeof GenericResource,
                ImageResource: typeof ImageResource,
                AudioResource: typeof AudioResource,
                FontResource: typeof FontResource,

                MaterialManager: typeof MaterialManager,
                Material: typeof Material,

                AudioManager: typeof AudioManager,
                Sound: typeof Sound,

                GooballManager: typeof GooballManager,
                Gooball: typeof Gooball,
                GooballEye: typeof GooballEye,

                PipeManager: typeof PipeManager,
                Pipe: typeof Pipe,

                IslandManager: typeof IslandManager,
                Island: typeof Island,
                IslandLevel: typeof IslandLevel,

                LevelManager: typeof LevelManager,
                Level: typeof Level,
                Camera: typeof Camera,
                CameraKeyframe: typeof CameraKeyframe,
                GenericBody: typeof GenericBody,
                RectBody: typeof RectBody,
                CircleBody: typeof CircleBody,
                Strand: typeof Strand,
                LevelButton: typeof LevelButton,

                Canvas: typeof Canvas,
                CanvasButton: typeof CanvasButton,
                
                ProfileManager: typeof ProfileManager,
                Profile: typeof Profile,
                LevelProfile: typeof LevelProfile
            },
            Utils,
            InputTracker: InputTracker,
            TimeManager: TimeManager,
            TextManager: TextManager,
            ResourceManager: ResourceManager,
            MaterialManager: MaterialManager,
            AudioManager: AudioManager,
            GooballManager: GooballManager,
            PipeManager: PipeManager,
            IslandManager: IslandManager,
            LevelManager: LevelManager,
            Canvas: Canvas,
            ProfileManager: ProfileManager,

            timePassed: number,
            arguments: {}
        }
    }
}