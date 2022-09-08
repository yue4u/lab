import { effect, signal } from "@preact/signals";
import { type ChangeEventHandler } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";
import pixelmatch from "pixelmatch";
import s from "./img-diff.module.css";

const config = signal({ threshold: 0 });
const imgs = signal<{
    img1: HTMLImageElement | null;
    img2: HTMLImageElement | null;
    img1Url: string | null;
    img2Url: string | null;
}>({
    img1: null,
    img2: null,
    img1Url: null,
    img2Url: null,
});
const diffCanvas = signal<HTMLCanvasElement | null>(null);
const diffData = signal<{
    img1: ImageData;
    img2: ImageData;
    diff: ImageData;
    w: number;
    h: number;
} | null>(null);
const diffResult = signal<{ diffPixels: number, diffRatio: string } | null>(null);

// https://talk.observablehq.com/t/dom-context2d-vs-dom-canvas-what-am-i-doing-wrong/3836/2
function context2d(
    width: number,
    height: number,
) {
    const dpi = devicePixelRatio;
    const canvas = Object.assign(document.createElement("canvas"), {
        width: width * dpi,
        height: height * dpi,
    });
    canvas.style.width = width + "px";
    const context = canvas.getContext("2d")!;
    context.scale(dpi, dpi);
    return context;
}

// prepare
effect(() => {
    const { img1, img2 } = imgs.value;
    if (!(img1 && img2)) return;
    if (!diffCanvas.value) return;

    const { width: w, height: h } = img1;
    const getImageData = (img: HTMLImageElement) => {
        const ctx = context2d(w, h);
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h);
    };

    diffData.value = {
        img1: getImageData(img1),
        img2: getImageData(img2),
        diff: context2d(w, h).createImageData(w, h),
        w,
        h,
    };
});

// do pixelmatch, sepereated effect to avoid redrawing img while change options
effect(() => {
    if (!diffCanvas.value) return;
    if (!diffData.value) return;

    const { img1, img2, diff, w, h } = diffData.value;
    const options = {
        threshold: config.value.threshold,
    };
    const diffPixels = pixelmatch(img1.data, img2.data, diff.data, w, h, options);
    diffResult.value = {
        diffPixels,
        diffRatio: (diffPixels / (w * h)).toLocaleString('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }
    diffCanvas.value.width = w;
    diffCanvas.value.height = h;
    const ctx = diffCanvas.value.getContext('2d')!
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(diff, 0, 0);
});

type BindKey = "1" | "2";
type BindKeyProps = { bind: BindKey };

export function App() {
    return (
        <>
            <h1>Img Diff</h1>
            <Options />
            <div class={s.container}>
                <ImgInput bind="1" />
                <ImgInput bind="2" />
            </div>
            <DiffResult />
            <DiffCanvas />
        </>
    );
}

function Options() {
    return (
        <div class={s.options}>
            <label for="threshold">threshold: {config.value.threshold}</label>
            <input
                id="threshold"
                class={s.threshold}
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.value.threshold}
                onChange={(e) => {
                    config.value = {
                        threshold: e.currentTarget.valueAsNumber,
                    };
                }}
            />
        </div>
    );
}

const bindImg =
    (key: BindKey): ChangeEventHandler<HTMLInputElement> => async (event) => {
        const file: File | undefined = event.currentTarget.files?.[0];
        if (!file) return;

        const prev = imgs.peek();
        const prevUrl = prev[`img${key}Url`];
        if (prevUrl) {
            URL.revokeObjectURL(prevUrl);
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = url;
        });
        imgs.value = {
            ...prev,
            [`img${key}`]: img,
            [`img${key}Url`]: url,
        };
    };

function ImgInput({ bind }: BindKeyProps) {
    return (
        <div>
            <input
                class={s.imgInput}
                type="file"
                accept="image/*"
                onChange={bindImg(bind)}
            />
            <ImgDispay bind={bind} />
        </div>
    );
}

function ImgDispay({ bind }: BindKeyProps) {
    const src = imgs.value[`img${bind}Url`];
    if (!src) return null;
    return <img class={s.img} src={src} />
}

function DiffResult() {
    if (!diffResult.value) return null;
    const { diffPixels, diffRatio } = diffResult.value;
    return (
        <div>
            <h2>Result</h2>
            <p>diffPixels: {diffPixels}, diffRatio: {diffRatio}</p>
        </div>
    );
}

function DiffCanvas() {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        diffCanvas.value = ref.current;
    }, []);

    return <canvas class={s.diffCanvas} ref={ref} />;
}