#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;
const float PI = 3.1415926;

vec3[3]colors = vec3[](
    vec3(0.2, 0.2, 1.0),
    vec3(1.0, 0.2, 0.2),
    vec3(1.0)
);

vec3 tex(vec2 st) {
    st.s += u_time;
    st.s = st.s / PI + 1.0;
    int idx = int(st.s);
    vec3 color = mix(colors[idx %2], colors[(idx + 1)%2], fract(st.s));
    return mix(colors[2], color, st.t);
}

vec2 xy2pol(vec2 xy) {
    return vec2(atan(xy.y, xy.x), length(xy));
}

void main() {
    vec2 pos = gl_FragCoord.xy / u_resolution.xy;
    pos = 2.0 * pos.xy - vec2(1.0);
    pos = xy2pol(pos);
    fragColor = vec4(tex(pos), 1.0);
}