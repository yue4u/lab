<template>
    <p>
        implements
        <a
            href="https://coursera.cs.princeton.edu/algs4/assignments/collinear/specification.php"
            target="_blank"
            rel="noopener noreferrer"
        >https://coursera.cs.princeton.edu/algs4/assignments/collinear/specification.php</a>
    </p>
    <p>
        <button
            @click="input = CASE[val]"
            :disabled="input === CASE[val]"
            v-for="val in ([0, 1] as const)"
        >input {{ val }}</button>
        <button @click="points = randomCase()">random</button>
    </p>
    <textarea v-model="input"></textarea>
    <p v-if="NSegments">Random: should have more than {{ NSegments }} segments</p>
    <vue3-chart-js
        class="chart"
        ref="chartRef"
        type="scatter"
        :data="chartData"
        :options="options"
    />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
// @ts-ignore
import Vue3ChartJs from '@j-t-mcc/vue3-chartjs'
import type { ChartOptions, ChartData } from 'chart.js'
import { random, randomInt } from '@/site/utils'

const MAX = 32767;
const CASE = [
    `6
19000  10000
18000  10000
32000  10000
21000  10000
1234  5678
14000  10000`
    , `8
10000  0
0  10000
3000  7000
7000  3000
20000  21000
3000  4000
14000  15000
6000  7000`,
]

const chartRef = ref<any>(null)
const input = ref(CASE[0])
const NExtra = ref(0)
const NSegments = ref(0)
const points = ref<Point[]>(randomCase());

interface Point {
    x: number,
    y: number,
}

function parse(text: string) {
    const [_, ...lines] = text.split('\n')
    return lines.map(line => {
        const [x, y] = line.split('  ').map(Number)
        if ([x, y].some(Number.isNaN)) return null
        return { x, y }
    }).filter((x): x is Point => Boolean(x))

}

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

const distance = (p1: Point, p2: Point) => (p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2


const segments = computed(() => {
    const items: any[] = []
    points.value.map((p1, i1) => {
        // i don't get why it's supposed to do a merge sort here.
        // using a map seems better?
        let map = new Map<number, number[]>()

        points.value.forEach((p2, i2) => {
            if (i2 === i1) return
            if (p1.x > p2.x) return
            // slope calculation seems cacheable?
            const slope = Math.floor((p2.y - p1.y) / (p2.x - p1.x) * 100) / 100
            const exist = map.get(slope) ?? [];
            map.set(slope, [...exist, i2])
        })

        Array.from(map.values()).map(value => {
            if (value.length !== 3) return

            // distance calculation seems cacheable?
            const sorted = value.sort((a, b) => distance(points.value[a], p1) - distance(points.value[b], p1));
            items.push({
                type: 'line',
                label: 'segment',
                borderColor: "hotpink",
                data: [p1, points.value[sorted.pop()!]],
            })
        })
    })
    return items
})

watch(input, () => {
    NSegments.value = 0;
    points.value = parse(input.value)
})

watch(points, () => {
    chartData.datasets = [
        { ...chartData.datasets[0], data: points.value },
        ...segments.value
    ]
    chartRef.value.update(250)
})

const chartData: ChartData = {
    datasets: [
        {
            type: 'bubble',
            label: 'dot',
            data: points.value,
            borderColor: "skyblue",
            backgroundColor: "#87ceeb5e",
            pointStyle: 'circle'
        },
        ...segments.value
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
</style>