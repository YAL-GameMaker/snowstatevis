(async function () {
	const debugGraph = false; // show an extra canvas with connections for clarity?
	
	const searchParams = new URLSearchParams(document.location.search);
	
	let wsPort = searchParams.get("port");
	if (wsPort == null) {
		const wsPortRe = await fetch("wsPort.json");
		wsPort = await wsPortRe.text();
	}
	
	const socket = new WebSocket(`ws://${document.location.hostname}:${wsPort}`);
	const viewsElement = document.getElementById("views");
	const listElement = document.getElementById("list");
	const fsmToggles = [];
	const fsmViews = [];
	function arrFind(arr, game, name) {
		return arr.filter(q => q.game == game && q.name == name)[0];
	}
	function arrRemove(arr, value) {
		var i = arr.indexOf(value);
		if (i >= 0) arr.splice(i, 1);
	}
	// Connection opened
	console.log("Connecting...");
	var ready = false;
	function send(obj) {
		if (ready) socket.send(JSON.stringify(obj));
	}
	socket.addEventListener("open", (event) => {
		ready = true;
		console.log("Connected!");
		send({ type: "hello" });
	});
	socket.addEventListener("close", (event) => {
		let label = document.createElement("label");
		label.appendChild(document.createTextNode(ready ? "Disconnected!" : "Failed to connect!"));
		listElement.appendChild(label);
		ready = false;
	});
	socket.addEventListener("error", (event) => {
		console.error(event);
		ready = false;
		let label = document.createElement("label");
		label.appendChild(document.createTextNode("Error!"));
		listElement.appendChild(label);
	});

	let sendFsmChangeOnCheckbox = true;
	function sendFsmChange(game, name, newState) {
		send({
			type: "fsm.change",
			game, name,
			current: newState,
		})
	}
	function createSvg(name, attrs) {
		let node = document.createElementNS("http://www.w3.org/2000/svg", name);
		for (let key of Object.keys(attrs)) {
			node.setAttribute(key, attrs[key]);
		}
		return node;
	}
	function lerp(a, b, f) {
		return a * (1 - f) + b * f;
	}
	
	function easeInOutQuad(n) {
		return n <= .5 ? 2 * n * n : 2 * (n -= .5) * (1 - n) + .5;
	}
	let fadeList = [];
	class Fader {
		onAnimationFrame() {
			let i = this.list.length;
			while (--i >= 0) {
				let el = this.list[i];
				let fade = 1 - (Date.now() - el.__fadeStart) / el.__fadeTime;
				if (fade <= 0) {
					el.classList.remove("fade");
					el.style.setProperty("--fade", null);
					this.list.splice(i, 1);
				} else {
					el.style.setProperty("--fade", easeInOutQuad(fade).toFixed(3));
				}
			}
			if (this.list.length > 0) {
				requestAnimationFrame(this.boundAnimationFrame);
			} else this.hasRequestAnimationFrame = false;
		}
		add(el) {
			if (!this.hasRequestAnimationFrame) {
				this.hasRequestAnimationFrame = true;
				requestAnimationFrame(this.boundAnimationFrame);
			}
			el.__fadeStart = Date.now();
			el.__fadeTime = 300;
			el.classList.add("fade");
			el.style.setProperty("--fade", "1");
			this.list.push(el);
		}
		remove(el) {
			let ind = this.list.indexOf(el);
			if (ind >= 0) {
				el.classList.remove("fade");
				el.style.setProperty("--fade", null);
				this.list.splice(ind, 1);
			}
		}
		constructor() {
			this.list = [];
			this.hasRequestAnimationFrame = false;
			this.boundAnimationFrame = () => {
				this.onAnimationFrame();
			}
		}
	}
	const fader = new Fader();

	const edgeSep = "\x1B";
	function handleMessage(msg) {
		switch (msg.type) {
			case "fsm_list.add":
				for (let pair of msg.array) {
					pair.label = document.createElement("label");
					let cb = document.createElement("input");
					cb.type = "checkbox";
					cb.onchange = () => {
						let want = cb.checked;
						send({
							type: want ? "fsm.watch" : "fsm.unwatch",
							game: pair.game,
							name: pair.name
						});
						if (!want) {
							let view = arrFind(fsmViews, pair.game, pair.name);
							if (view) {
								view.element.remove();
								fsmViews.splice(fsmViews.indexOf(view), 1);
							}
						}
					};
					pair.label.appendChild(cb);
					pair.label.appendChild(document.createTextNode(pair.game + " · " + pair.name));
					fsmToggles.push(pair);
					listElement.appendChild(pair.label);
				}
				break;
			case "fsm_view.add":
				let viewCtr = document.createElement("div");
				viewCtr.classList.add("view");

				let header = document.createElement("h2");
				header.appendChild(document.createTextNode(msg.name));
				viewCtr.appendChild(header);

				viewsElement.appendChild(viewCtr);

				var g = new dagre.graphlib.Graph();
				g.setGraph({});
				g.setDefaultEdgeLabel(function () { return {}; });

				let graphCtr = document.createElement("div");
				graphCtr.classList.add("graph");
				viewCtr.appendChild(graphCtr);

				graphCtr.innerHTML = `
<svg
   version="1.1"
   id="arrows"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"
   stroke="black"
>
  <defs
     id="defs2">
    <marker
       style="overflow:visible"
       id="TriangleStart"
       refX="2"
       refY="0"
       orient="auto-start-reverse"
       inkscape:stockid="TriangleStart"
       markerWidth="3.3239999"
       markerHeight="3.8427744"
       viewBox="0 0 5.3244081 6.1553851"
       inkscape:isstock="true"
       inkscape:collect="always"
       preserveAspectRatio="xMidYMid">
      <path
         transform="scale(0.5)"
         style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
         d="M 5.77,0 -2.88,5 V -5 Z"
         id="path135" />
    </marker>
  </defs>
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="arrows">
  </g>
</svg>`

				let svg = graphCtr.querySelector("svg#arrows");
				let svgArrows = svg.querySelector("g#arrows");
				let svgNodes = Object.create(null);
				let svgEdges = Object.create(null);

				for (let state of msg.states) {
					let stateBox = document.createElement("span");
					stateBox.classList.add("state");
					if (state == msg.current) stateBox.classList.add("current");
					stateBox.innerText = state;
					stateBox.onclick = function () {
						sendFsmChange(msg.game, msg.name, state);
					}
					graphCtr.insertBefore(stateBox, svg);
					svgNodes[state] = stateBox;

					g.setNode(state, {
						label: state,
						width: stateBox.offsetWidth,
						height: stateBox.offsetHeight,
						_node: stateBox,
					});
				}

				for (let from of Object.keys(msg.transit)) {
					let tol = msg.transit[from];
					if (Array.isArray(tol)) {
						for (let to of tol) {
							g.setEdge(from, to);
						}
					} else if (typeof (tol) == "string") {
						g.setEdge(from, tol);
					} else {
						console.error("Unknown `to` value", tol, "in", msg);
					}
				}
				dagre.layout(g);

				let graphWidth = 0, graphHeight = 0, graphX = Infinity, graphY = Infinity;
				for (let state of g.nodes()) {
					let inf = g.node(state);
					//console.log(state, inf);
					let label = inf._node;
					label.style.left = (inf.x | 0) + "px";
					label.style.top = (inf.y | 0) + "px";
					graphWidth = Math.max(graphWidth, inf.x + inf.width);
					graphHeight = Math.max(graphHeight, inf.y + inf.height);
					graphX = Math.min(graphX, inf.x);
					graphY = Math.min(graphY, inf.y);
				}
				
				let canvas = null, context = null;
				if (debugGraph) {
					canvas = document.createElement("canvas");
					canvas.width = graphWidth;
					canvas.height = graphHeight;
					viewCtr.appendChild(canvas);
					context = canvas.getContext("2d");
					context.font = "12px sans-serif";
					context.textAlign = "center";
					context.textBaseline = "middle";
					for (let state of g.nodes()) {
						let inf = g.node(state);
						context.fillStyle = "#f0f0f0";
						context.fillRect(inf.x, inf.y, inf.width, inf.height);
						context.strokeStyle = "black";
						context.strokeRect(inf.x, inf.y, inf.width, inf.height);
						context.fillStyle = "black";
						context.fillText(state, inf.x + (inf.width>>1), inf.y + (inf.height>>1), inf.width);
					}
				}
				
				for (let edge_id of g.edges()) {
					let edge = g.edge(edge_id);

					let edgeArrowData = "m";
					let lastPoint = { x: -graphX, y: -graphY };
					if (edge.points.length == 3) {
						let p0 = edge.points[0];
						let p0x = p0.x - lastPoint.x;
						let p0y = p0.y - lastPoint.y;

						let p1 = edge.points[1];
						let p1x = p1.x - p0.x;
						let p1y = p1.y - p0.y;

						let p2 = edge.points[2];
						let p2x = p2.x - p0.x;
						let p2y = p2.y - p0.y;

						edgeArrowData += ` ${p0x},${p0y} q ${p1x},${p1y} ${p2x},${p2y}`;
					} else for (let point of edge.points) {
						edgeArrowData += " " + (point.x - lastPoint.x) + "," + (point.y - lastPoint.y);
						lastPoint = point;
					}

					let edgeArrow = createSvg("path", {
						d: edgeArrowData,
						"data-from": edge_id.v,
						"data-to": edge_id.w,
						style: [
							"fill: none",
							"stroke-width: 2",
							"stroke-linecap: round",
							"stroke-linejoin: round",
							"marker-end:url(#TriangleStart)",
						].join(";"),
					});
					svgArrows.appendChild(edgeArrow);
					svgEdges[edge_id.v + edgeSep + edge_id.w] = edgeArrow;
					
					if (debugGraph) {
						context.beginPath();
						lastPoint = null;
						for (let point of edge.points) {
							if (lastPoint == null) {
								context.moveTo(graphX + point.x, graphY + point.y);
							} else context.lineTo(graphX + point.x, graphY + point.y);
							lastPoint = point;
						}
						context.strokeStyle = "black";
						context.stroke();
						context.beginPath();
						context.arc(graphX + lastPoint.x, graphY + lastPoint.y, 3, 0, Math.PI*2);
						context.fill();
					}
				}
				graphWidth = Math.ceil(graphWidth);
				graphHeight = Math.ceil(graphHeight);

				svg.setAttribute("viewBox", `0 0 ${graphWidth} ${graphHeight}`);
				//svg.setAttribute("width", graphWidth + "px");
				//svg.setAttribute("height", graphHeight + "px");
				graphCtr.style.width = graphWidth + "px";
				graphCtr.style.height = graphHeight + "px";


				fsmViews.push({
					game: msg.game,
					name: msg.name,
					element: viewCtr,
					nodes: svgNodes,
					edges: svgEdges,
					current: msg.current,
					currentNode: svgNodes[msg.current],
				});
				break;
			case "fsm_view.update":
				let view = arrFind(fsmViews, msg.game, msg.name);
				if (!view) break;
				if (view.currentNode) {
					view.currentNode.classList.remove("current");
					fader.add(view.currentNode);
					let edge = view.edges[view.current + edgeSep + msg.current];
					if (edge) {
						fader.add(edge);
					}
				}
				let node = view.nodes[msg.current];
				if (node) {
					node.classList.add("current");
				}
				view.current = msg.current;
				view.currentNode = node;
				break;
		}
	}

	// Listen for messages
	const nul = String.fromCharCode(0);
	socket.addEventListener("message", async (event) => {
		let text = await event.data.text();

		// we're sending text with \0 endings from GM so 
		if (nul.endsWith(nul)) text = text.substring(0, text.length - 1);
		console.info("Server says:", text);
		//try {
		handleMessage(JSON.parse(text));
		//} catch (e) {
		//	console.error(e);
		//}
	});
})();