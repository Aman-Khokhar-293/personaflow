/**
 * PersonaFlow - Three.js Animation Converter
 * Converts blendshape data into Three.js AnimationClip objects
 * Ported from 3d/src/converter.js (React version) to vanilla JS
 */

const ThreeConverter = {
    fps: 60,

    modifiedKey(key) {
        const eyeKeys = [
            "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight",
            "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight"
        ];
        if (eyeKeys.includes(key)) return key;
        if (key.endsWith("Right")) return key.replace("Right", "_R");
        if (key.endsWith("Left")) return key.replace("Left", "_L");
        return key;
    },

    createAnimation(recordedData, morphTargetDictionary, bodyPart) {
        if (!recordedData || recordedData.length === 0 || !morphTargetDictionary) return null;

        const animation = [];
        for (let i = 0; i < Object.keys(morphTargetDictionary).length; i++) {
            animation.push([]);
        }

        const time = [];
        let finishedFrames = 0;

        recordedData.forEach((d) => {
            if (!d.blendshapes) return;
            Object.entries(d.blendshapes).forEach(([key, value]) => {
                const modKey = this.modifiedKey(key);
                if (!(modKey in morphTargetDictionary)) return;
                if (key === 'mouthShrugUpper') value += 0.4;
                animation[morphTargetDictionary[modKey]].push(value);
            });
            time.push(finishedFrames / this.fps);
            finishedFrames++;
        });

        const tracks = [];

        Object.entries(recordedData[0].blendshapes).forEach(([key]) => {
            const modKey = this.modifiedKey(key);
            if (!(modKey in morphTargetDictionary)) return;

            const i = morphTargetDictionary[modKey];
            if (!animation[i] || animation[i].length === 0) return;

            const track = new THREE.NumberKeyframeTrack(
                `${bodyPart}.morphTargetInfluences[${i}]`,
                time,
                animation[i]
            );
            tracks.push(track);
        });

        if (tracks.length === 0) return null;
        return new THREE.AnimationClip('animation', -1, tracks);
    }
};
