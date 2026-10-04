'use strict';
(() => {
let isMotionStopped=false, isHighContrast=false, animationFrame=0;
    const canvas = document.getElementById('neuralCanvas');
    const ctx = canvas.getContext('2d');
    const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
    let userPrefersReducedMotion=motionPreference.matches;

    // Colors
    const COLORS = {
        cyan:   [0, 212, 255],
        violet: [139, 92, 246],
        rose:   [244, 63, 94]
    };
    const COLOR_LIST = [COLORS.cyan, COLORS.violet, COLORS.rose];

    function getConfig() {
        const w = window.innerWidth;
        if (w > 1100) return { nodes: 85, perCluster: 9, transit: 4, knn: 3, dprCap: 2 };
        if (w > 768)  return { nodes: 38, perCluster: 4, transit: 2, knn: 2, dprCap: 1.5 };
        return                { nodes: 22, perCluster: 3, transit: 1, knn: 1, dprCap: 1.5 };
    }

    let nodes = [], edges = [], clusters = {};
    let W, H, dpr;
    const camera = { progress: 0 };
    let isVisible = true;
    let time = 0;

    function resizeCanvas() {
        const cfg = getConfig();
        dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let seed = 42;
    function srand() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }

    function gaussRand() {
        let u = 0, v = 0;
        while (u === 0) u = srand();
        while (v === 0) v = srand();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function generateNetwork() {
        const cfg = getConfig();
        nodes = [];
        edges = [];
        clusters = {};
        seed = 42;

        const sections = document.querySelectorAll('[data-section]');
        const docH = document.body.scrollHeight || 1000;
        const sectionData = [];

        sections.forEach(sec => {
            const name = sec.dataset.section;
            const top = sec.offsetTop / docH;
            const h = sec.offsetHeight / docH;
            const cy = top + h / 2;
            sectionData.push({ name, cy, top, h });
            clusters[name] = { activation: 0, nodes: [] };
        });

        sectionData.forEach(sd => {
            const count = cfg.perCluster;
            for (let i = 0; i < count; i++) {
                const node = {
                    bx: 0.15 + srand() * 0.7,
                    by: sd.cy + gaussRand() * sd.h * 0.25,
                    z: srand(),
                    baseR: 2 + srand() * 3,
                    color: COLOR_LIST[Math.floor(srand() * 3)],
                    cluster: sd.name,
                    glow: 0,
                    phase: srand() * Math.PI * 2,
                    rx: 0, ry: 0, r: 0, opacity: 0
                };
                nodes.push(node);
                clusters[sd.name].nodes.push(nodes.length - 1);
            }
        });

        for (let i = 0; i < sectionData.length - 1; i++) {
            const y1 = sectionData[i].cy + sectionData[i].h * 0.3;
            const y2 = sectionData[i + 1].cy - sectionData[i + 1].h * 0.3;
            for (let t = 0; t < cfg.transit; t++) {
                const frac = (t + 1) / (cfg.transit + 1);
                nodes.push({
                    bx: 0.1 + srand() * 0.8,
                    by: y1 + (y2 - y1) * frac + gaussRand() * 0.01,
                    z: srand(),
                    baseR: 1.5 + srand() * 2,
                    color: COLOR_LIST[Math.floor(srand() * 3)],
                    cluster: null,
                    glow: 0,
                    phase: srand() * Math.PI * 2,
                    rx: 0, ry: 0, r: 0, opacity: 0
                });
            }
        }

        const k = cfg.knn;
        for (let i = 0; i < nodes.length; i++) {
            const dists = [];
            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;
                const dx = nodes[i].bx - nodes[j].bx;
                const dy = (nodes[i].by - nodes[j].by) * 5;
                dists.push({ j, d: dx*dx + dy*dy });
            }
            dists.sort((a, b) => a.d - b.d);
            for (let n = 0; n < Math.min(k, dists.length); n++) {
                const j = dists[n].j;
                if (!edges.some(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
                    edges.push({ a: i, b: j, flow: srand(), speed: 0.002 + srand() * 0.003 });
                }
            }
        }
    }

    function updateNodes() {
        const prog = camera.progress;
        const totalTravel = document.body.scrollHeight;
        const sigma = H * 0.4;

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const parallax = 0.3 + n.z * 1.7;

            const docY = n.by * totalTravel;
            const scrollY = prog * (totalTravel - H);
            let screenY = docY - scrollY * parallax;

            const range = totalTravel * 0.6;
            if (screenY < -200) screenY += range;
            if (screenY > H + 200) screenY -= range * 0.3;

            const distCenter = Math.abs(screenY - H * 0.5);
            const proximity = Math.exp(-(distCenter * distCenter) / (2 * sigma * sigma));

            // Stop drift if user requested reduced motion OR clicked the accessibility stop button
            const motionActive = !userPrefersReducedMotion && !isMotionStopped;
            const drift = motionActive ? Math.sin((time * 0.5) + prog * Math.PI * 3 + n.phase) * 25 * n.z : 0;

            n.rx = n.bx * W + drift;
            n.ry = screenY;
            n.r = n.baseR * (0.4 + proximity * 0.3);
            n.opacity = 0.1 + proximity * 0.25;

            if (n.cluster && clusters[n.cluster]) {
                const act = clusters[n.cluster].activation;
                n.glow = act;
                n.opacity += act * 0.15;
            }
        }
    }

    function render() {
        if (!isVisible) return;

        const motionActive = !userPrefersReducedMotion && !isMotionStopped;
        if (motionActive) time += 0.016;

        ctx.clearRect(0, 0, W, H);
        updateNodes();

        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            const na = nodes[e.a], nb = nodes[e.b];
            if (na.ry < -100 && nb.ry < -100) continue;
            if (na.ry > H + 100 && nb.ry > H + 100) continue;

            const avgGlow = Math.max(na.glow, nb.glow);
            const avgOp = (na.opacity + nb.opacity) * 0.5;
            const lineOp = avgOp * 0.3 + avgGlow * 0.2;
            if (lineOp < 0.01) continue;

            ctx.beginPath();
            ctx.moveTo(na.rx, na.ry);
            ctx.lineTo(nb.rx, nb.ry);

            // In high contrast mode, draw lines differently
            if(isHighContrast) {
                 ctx.strokeStyle = `rgba(255,255,0,${Math.min(lineOp, 0.5)})`;
            } else {
                 ctx.strokeStyle = `rgba(139,92,246,${Math.min(lineOp, 0.35)})`;
            }
            ctx.lineWidth = 0.5 + avgGlow * 1;
            ctx.stroke();

            if (motionActive) {
                const pulseSpeed = e.speed + avgGlow * 0.008;
                e.flow = (e.flow + pulseSpeed) % 1;
                const px = na.rx + (nb.rx - na.rx) * e.flow;
                const py = na.ry + (nb.ry - na.ry) * e.flow;
                const pulseOp = 0.15 + avgGlow * 0.55;
                const pulseR = 1 + avgGlow * 1.5;
                ctx.beginPath();
                ctx.arc(px, py, pulseR, 0, Math.PI * 2);
                ctx.fillStyle = isHighContrast ? `rgba(255,255,0,${pulseOp})` : `rgba(0,212,255,${pulseOp})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.ry < -50 || n.ry > H + 50) continue;
            if (n.opacity < 0.02) continue;

            ctx.beginPath();
            ctx.arc(n.rx, n.ry, n.r, 0, Math.PI * 2);
            if(isHighContrast) {
                 ctx.fillStyle = `rgba(255,255,0,${Math.min(n.opacity, 0.7)})`;
            } else {
                 ctx.fillStyle = `rgba(${n.color[0]},${n.color[1]},${n.color[2]},${Math.min(n.opacity, 0.5)})`;
            }
            ctx.fill();
        }

        if(motionActive) animationFrame=requestAnimationFrame(render);
    }


    const toggle=document.getElementById('toggle-background');
    function updateCamera(){
        camera.progress=scrollY/Math.max(1,document.body.scrollHeight-innerHeight);
        document.querySelectorAll('[data-section]').forEach(sec=>{
            const r=sec.getBoundingClientRect(),progress=Math.max(0,Math.min(1,(H*.85-r.top)/(r.height+H*.7)));
            if(clusters[sec.dataset.section])clusters[sec.dataset.section].activation=Math.sin(progress*Math.PI);
        });
    }
    function restart(){cancelAnimationFrame(animationFrame);updateCamera();render();}
    function rebuild(){resizeCanvas();generateNetwork();restart();}
    function updateToggle(){toggle.setAttribute('aria-pressed',String(isMotionStopped));toggle.textContent=isMotionStopped?'הפעלת רקע':'השהיית רקע';toggle.hidden=userPrefersReducedMotion;}
    toggle.addEventListener('click',()=>{isMotionStopped=!isMotionStopped;updateToggle();restart();});
    motionPreference.addEventListener('change',e=>{userPrefersReducedMotion=e.matches;updateToggle();restart();});
    addEventListener('scroll',()=>{updateCamera();if(userPrefersReducedMotion||isMotionStopped)restart();},{passive:true});
    let resizeTimer;
    addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(rebuild,150);});
    document.addEventListener('visibilitychange',()=>{isVisible=!document.hidden;restart();});
    // Accordion and filter changes alter the same page geometry used by the homepage animation.
    new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(rebuild,150);}).observe(document.querySelector('main'));
    updateToggle();rebuild();
})();
