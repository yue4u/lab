<template>
    <p>
        implements
        <a href="https://coursera.cs.princeton.edu/algs4/assignments/collinear/specification.php" target="_blank"
            rel="noopener noreferrer">https://coursera.cs.princeton.edu/algs4/assignments/collinear/specification.php</a>
    </p>
    <div class="input">
        <select class="test-container" @change="
            // @ts-expect-error
            input = $event.target.value ?? randomCase()
        ">
            <option :disabled="input === val" :value="val" :key="key" v-for="[key, val] in tests">{{ key }}</option>
            <option :value="undefined">random</option>
        </select>
        <textarea v-model="input" />
    </div>
    <p v-if="NSegments">Random: should have more than {{ NSegments }} segments</p>

    <vue3-chart-js class="chart" ref="chartRef" type="scatter" :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
// @ts-ignore
import Vue3ChartJs from '@j-t-mcc/vue3-chartjs'
import type { ChartOptions, ChartData } from 'chart.js'
import { random, randomInt } from '@/site/utils'
import { Point, parse, getSegments } from './collinear'

const chartRef = ref<any>(null)
const tests = (Object.entries(import.meta.glob('./collinear/*.txt', { as: 'raw', eager: true }))).sort()

const MAX = 32767;
const input = ref(tests[0][1])
const NExtra = ref(0)
const NSegments = ref(0)
const points = ref<Point[]>(parse(tests[0][1]));
const segments = computed(() => {
    return getSegments(points.value)
})

watch(input, () => {
    NSegments.value = 0;
    points.value = parse(input.value)
})

watch(points, () => {
    chartData.datasets = [
        { ...chartData.datasets[0], data: points.value },
        ...segments.value.map(mapper.lineFromPoints)
    ]
    chartRef.value.update(250)
})

function randomCase() {
    NExtra.value = randomInt(10, 20)
    NSegments.value = randomInt(1, 5)
    const dots: Point[] = []

    Array.from({ length: NExtra.value }, () => {
        dots.push({
            x: randomInt(0, MAX),
            y: randomInt(0, MAX)
        })
    })

    Array.from({ length: NSegments.value }, () => {
        const step = Math.floor(randomInt(1000, 7000) / 250) * 250
        const randomSlope = Math.floor(random(-1, 1) * 100) / 100;
        const randomD = randomInt(0, Math.min(MAX - randomSlope * step * 4, MAX) - 5000);

        Array.from({ length: 4 }, (_, i) => {
            const randomX = (i + 1) * step
            dots.push({
                x: randomX,
                y: randomSlope * randomX + randomD
            })
        })
    })
    return dots
}

const mapper = {
    bubbleFromPoints(data: Point[]) {
        return {
            type: 'bubble',
            label: 'dot',
            data,
            borderColor: "skyblue",
            backgroundColor: "#87ceeb5e",
            pointStyle: 'circle'
        } as const
    },
    lineFromPoints(data: [Point, Point], i: number) {
        return {
            type: "line",
            label: `line-${i + 1}`,
            borderColor: "hotpink",
            data,
        } as const
    }
}

const chartData: ChartData = {
    datasets: [
        mapper.bubbleFromPoints(points.value),
        ...segments.value.map(mapper.lineFromPoints)
    ]
}

const options: ChartOptions = {
    aspectRatio: 1,
    plugins: {
        legend: {
            labels: {
                color: '#fff',
                font: {
                    weight: '800',
                    size: 16
                }
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: true,
                color: '#333'
            },
            min: 0,
            max: MAX,
        },
        y: {
            grid: {
                display: true,
                color: '#333'
            },
            min: 0,
            max: MAX,
        }
    }
}

</script>

<style>
.chart {
    width: 500px;
    height: 500px;
}

.input {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
}

.test-container {
    width: inherit;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
}
</style>