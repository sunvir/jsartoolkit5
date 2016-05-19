/* THREE.js ARToolKit integration */

(function() {

	var integrate = function() {
		console.log("IN INTEGRATE");
		/**
			Helpers for setting up a Three.js AR scene using the device camera (getUserMediaScene) or video (getVideoThreeScene) as input. 
			Pass in the maximum dimensions of the video you want to process and onSuccess and onError callbacks.

			On a successful initialization, the onSuccess callback is called with an ThreeARScene object.
			The ThreeARScene object contains two THREE.js scenes (one for the video image and other for the 3D scene)
			and a couple of helper functions for doing video frame processing and AR rendering.

			Here's the structure of the ThreeARScene object:
			{
				scene: THREE.Scene, // The 3D scene. Put your AR objects here.
				camera: THREE.Camera, // The 3D scene camera.

				arController: ARController,

				video: HTMLVideoElement, // The userMedia video element.

				videoScene: THREE.Scene, // The userMedia video image scene. Shows the video feed.
				videoCamera: THREE.Camera, // Camera for the userMedia video scene.

				process: function(), // Process the current video frame and update the markers in the scene.
				renderOn: function( THREE.WebGLRenderer ) // Render the AR scene and video background on the given Three.js renderer.
			}

			You should use the arScene.video.videoWidth and arScene.video.videoHeight to set the width and height of your renderer.

			In your frame loop, use arScene.process() and arScene.renderOn(renderer) to do frame processing and 3D rendering, respectively.

			@param {number} width - The maximum width of the userMedia video to request.
			@param {number} height - The maximum height of the userMedia video to request.
			@param {function} onSuccess - Called on successful initialization with an ThreeARScene object.
			@param {function} onError - Called if the initialization fails with the error encountered.
		*/
		ARController.getUserMediaThreeScene = function(configuration) {
			var obj = {};
			for (var i in configuration) {
				obj[i] = configuration[i];
			}
			var onSuccess = configuration.onSuccess;

			obj.onSuccess = function(arController, arCameraParam) {
				var scenes = arController.createThreeScene();
				onSuccess(scenes, arController, arCameraParam);
			};

			var video = this.getUserMediaARController(obj);
			return video;
		};

		ARController.getVideoThreeScene = function(configuration) {
			var obj = {};
			for (var i in configuration) {
				obj[i] = configuration[i];
			}
			var onSuccess = configuration.onSuccess;
			var video = configuration.video; 
			var cameraParamURL = configuration.cameraParam;
			console.log(Date.now(), "##### VIDEO", video.readyState);
			// if (video.readyState != 4) {
			// 	return 0;
			// }

				// snippet from artoolkit.api.js ARController.getUserMediaARController
				new ARCameraParam(cameraParamURL, function() {
					console.log(Date.now(), "running arCameraParam for ", video.src);
					var arCameraParam = this;
					var maxSize = configuration.maxARVideoSize || Math.max(video.videoWidth, video.videoHeight);
					var f = maxSize / Math.max(video.videoWidth, video.videoHeight);
					var w = f * video.videoWidth;
					var h = f * video.videoHeight;
					if (video.videoWidth < video.videoHeight) {
						var tmp = w;
						w = h;
						h = tmp;
					}
					var arController = new ARController(w, h, arCameraParam);
					arController.image = video;
					if (video.videoWidth < video.videoHeight) {
						arController.orientation = 'portrait';
						arController.videoWidth = video.videoHeight;
						arController.videoHeight = video.videoWidth;
					} else {
						arController.orientation = 'landscape';
						arController.videoWidth = video.videoWidth;
						arController.videoHeight = video.videoHeight;
					}
					console.log("xGot ARController", arController);
					console.log("xGot ARCameraParam", arCameraParam);
					console.log("xGot video", arController.image);
					var scenes = arController.createThreeScene(video);
					onSuccess(scenes, arController, arCameraParam);

				}, function(err) {
						console.error("ARController: Failed to load ARCameraParam", err);
				});
		// -- end of snippet

			return video;
		};

		/*
		 detectAndAugment is a helper function that detects markers in a video, creates a new DOM element to 
		 display that video and augments it with THREE objects as specified in the 'markers' object.
		 Here's the structure of the markers object:
		 {
			pattern: pattern file or pattern number for barcode types
			replacement: THREE object to augment it with
			scale: Vector3 specifying how much to scale the replacement before displaying it on the marker

		 }
		@param {DOM Object} insertBefore - augmented video is placed before this object
		@param {Object} pattern - object defining marker detection modes, types, etc. 
		@param {Array} markers - see above
		*/
  		ARController.detectAndAugment = function(myvid, mycameraParam, insertBefore, pattern, markers) {
           ARController.getVideoThreeScene({
                video: myvid,
                cameraParam: mycameraParam,
                onSuccess: function(arScene, arController, arCamera) {
                    console.log("ARController", arController);
                    console.log("ARCameraParam", arCamera);
                    console.log("arScene", arScene);

                    console.log("video", arController.image);
                    document.body.className = arController.orientation;

                    if (pattern.detectionMode) {
                    	/*
						AR_TEMPLATE_MATCHING_COLOR
						AR_TEMPLATE_MATCHING_MONO
						AR_MATRIX_CODE_DETECTION
						AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX
						AR_TEMPLATE_MATCHING_MONO_AND_MATRIX
						The default mode is AR_TEMPLATE_MATCHING_COLOR.
						*/
                    	arController.setPatternDetectionMode(pattern.detectionMode);
					}
					if (pattern.matrixCodeType) {
						/*
	                	AR_MATRIX_CODE_3x3
	       				AR_MATRIX_CODE_3x3_HAMMING63
				        AR_MATRIX_CODE_3x3_PARITY65
				        AR_MATRIX_CODE_4x4
				        AR_MATRIX_CODE_4x4_BCH_13_9_3
				        AR_MATRIX_CODE_4x4_BCH_13_5_5
				        The default mode is AR_MATRIX_CODE_3x3.
				        */
						arController.setMatrixCodeType(pattern.matrixCodeType);
					}

                    var renderer = new THREE.WebGLRenderer({
                        antialias: true
                    });
                    if (arController.orientation === 'portrait') {
                        var w = (window.innerWidth / arController.videoHeight) * arController.videoWidth;
                        var h = window.innerWidth;
                        renderer.setSize(w, h);
                        renderer.domElement.style.paddingBottom = (w - h) + 'px';
                    } else {
                        if (/Android|mobile|iPad|iPhone/i.test(navigator.userAgent)) {
                            renderer.setSize(window.innerWidth, (window.innerWidth / arController.videoWidth) * arController.videoHeight);
                        } else {
                            renderer.setSize(arController.videoWidth, arController.videoHeight);
                            document.body.className += ' desktop';
                        }
                    }

                    document.body.insertBefore(renderer.domElement, insertBefore);

                    /* set up markers */
                    var markerRoot;
                   	var rotationTarget = new Array(); 
					var markerIndex = new Object();
					console.log ("DETECT MODE: " , arController.getPatternDetectionMode());                    
					console.log("markers", markers.length, markers);
					for (var i = 0; i< markers.length; i++ ) {
						rotationTarget[i] = 0;
						if (pattern.detectionMode == artoolkit.AR_TEMPLATE_MATCHING_COLOR ||
							pattern.detectionMode == artoolkit.AR_TEMPLATE_MATCHING_MONO) {
							console.log(Date.now(), "template marker added for marker ", i , markers[i]);
							arController.loadMarker(markers[i].pattern, function(markerId) {
								markerRoot = arController.createThreeMarker(markerId);
								if (markers[markerId].scale) {
							     	markers[markerId].replacement.scale.copy(markers[markerId].scale);
								}
								markerRoot.add(markers[markerId].replacement);
								markers[markerId].markerRoot = markerRoot;
								/* template/pattern markers are assigned id's sequentially, so as long as
								   we dont mix them with matrix markers, we should be ok.  
								   NOTE: mmid will not always equal markerRoot (e.g. matrix numbers are used for mmid in matrix code detection)
								*/
								var mmid = String(markerId); 
								markerIndex[mmid] = markerId;
								arScene.scene.add(markerRoot);
								console.log("marker added to scene ", markerId , markers[markerId], mmid);
							});
						}
						if (pattern.detectionMode == artoolkit.AR_MATRIX_CODE_DETECTION) {
							markerRoot = arController.createThreeBarcodeMarker(markers[i].pattern);
							 markerRoot.add(markers[i].replacement);
							 markers[i].markerRoot = markerRoot;
							 markers[i].marker = arController.getMarker(i);
							/* template/pattern markers are assigned id's sequentially, so as long as
							   we dont mix them with matrix markers, we should be ok.  
							   NOTE: mmid will not always equal markerRoot (e.g. matrix numbers are used for mmid in matrix code detection)
							*/
							 var mmid = String(markers[i].pattern); 
								markerIndex[mmid] = i;
						     arScene.scene.add(markerRoot);
							if (markers[i].scale) {
						    	markers[i].replacement.scale.copy(markers[i].scale); 
						 	}
						     console.log("threeBarcode marker added for ", i, markers[i], " at ", markerRoot);
						}

					}


					/* handle clicks */
                    var rotationV = 0;

                    renderer.domElement.addEventListener('click', function(ev) {
	                    console.log ("Click: ", ev);
	                    ev.preventDefault();

						console.log("marker count", arController.getMarkerNum());
						console.log("markerIndex", markerIndex);

						/* loop through all currently detected markers */
						for (var mm =0; mm< arController.getMarkerNum(); mm++) {
							var currentMarker = arController.getMarker(mm);
					        console.log("currentMarker", currentMarker.id, currentMarker.idPatt, currentMarker.idMatrix, markerIndex[String(currentMarker.id)]);
							console.log("markerRoot", markers[markerIndex[String(currentMarker.id)]]);
							/*  use this marker's unique pattern/id to find an index into the 'markers' array */
							var i = markerIndex[String(currentMarker.id)];

							/* if it exists and is visible, check if the click is on this marker  */
                        	if (i >= 0 && markers[i].markerRoot.visible) {
                        		console.log("uuid", markers[i].markerRoot.uuid);
                        		var uuid = markers[i].markerRoot.uuid;

	                        	var vector = new THREE.Vector3();

	                        	markers[i].markerRoot.updateMatrixWorld();
	                        	console.log("matrixworld updated:", markers[i].markerRoot, currentMarker);
	                       	    vector.setFromMatrixPosition(markers[i].markerRoot.matrixWorld);

	                       	    console.log("matrix pos " + i , vector);

	                       		var p = new THREE.Vector2(ev.offsetX, ev.offsetY);
	                       		var v = currentMarker.vertex;

	                       		/* do an axis-aligned bounding box compare */
	                       		console.log("ReUpdVec " + i , currentMarker, markers[i].markerRoot.visible);
	                       		var minX = Math.min(v[0][0], v[1][0], v[2][0], v[3][0]);
	       		                var minY = Math.min(v[0][1], v[1][1], v[2][1], v[3][1]);
								var maxX = Math.max(v[0][0], v[1][0], v[2][0], v[3][0]);
	       		                var maxY = Math.max(v[0][1], v[1][1], v[2][1], v[3][1]);
	       		                /* adjust for scale if needed */
        	                    if (markers[i].scale) {
		       		                var halfW = maxX-minX;
									var halfH = maxY-minY;
									var adjX = halfW * (1 - markers[i].scale.x);
									var adjY = halfH * (1 - markers[i].scale.y);
									minX += adjX; maxX -= adjX;
									minY += adjY; maxY -= adjY;
								} 

								console.log("COMPARE p", p, adjX, adjY);
								if( minX <= p.x && p.x <= maxX && minY <= p.y && p.y <= maxY ) {
									console.log(i,"COMPARE: HOORAY!", rotationTarget[i]);
									rotationTarget[i] += 2* Math.PI;

									/* call the onclick CB if it was defined */
									if (markers[i].onclick) {
										markers[i].onclick(markers[i].params, 
	                        				 "<br>" + rotationTarget[i] + markers[i].pattern );
									}
								} else {
									console.log(i,"COMPARE: far");
								}

                  			}
                  		}
                    }, false);

                    var tick = function() {
                        arScene.process();
                        arScene.renderOn(renderer);
                        for (var i=0; i<markers.length; i++) {
                        	rotationV += (rotationTarget[i] - markers[i].replacement.rotation.z) * 0.0872;
                        	markers[i].replacement.rotation.z += rotationV;
                        	rotationV = (rotationV < 0.1 ) ? 0 : rotationV * 0.5;
                    	}

                        requestAnimationFrame(tick);
                    };

                    tick();

                }
            });
        }





		/**
			Creates a Three.js scene for use with this ARController.

			Returns a ThreeARScene object that contains two THREE.js scenes (one for the video image and other for the 3D scene)
			and a couple of helper functions for doing video frame processing and AR rendering.

			Here's the structure of the ThreeARScene object:
			{
				scene: THREE.Scene, // The 3D scene. Put your AR objects here.
				camera: THREE.Camera, // The 3D scene camera.

				arController: ARController,

				video: HTMLVideoElement, // The userMedia video element.

				videoScene: THREE.Scene, // The userMedia video image scene. Shows the video feed.
				videoCamera: THREE.Camera, // Camera for the userMedia video scene.

				process: function(), // Process the current video frame and update the markers in the scene.
				renderOn: function( THREE.WebGLRenderer ) // Render the AR scene and video background on the given Three.js renderer.
			}

			You should use the arScene.video.videoWidth and arScene.video.videoHeight to set the width and height of your renderer.

			In your frame loop, use arScene.process() and arScene.renderOn(renderer) to do frame processing and 3D rendering, respectively.

			@param video Video image to use as scene background. Defaults to this.image
		*/
		ARController.prototype.createThreeScene = function(video) {
			video = video || this.image;

			this.setupThree();

			// To display the video, first create a texture from it.
			var videoTex = new THREE.Texture(video);

			videoTex.minFilter = THREE.LinearFilter;
			videoTex.flipY = false;

			// Then create a plane textured with the video.
			var plane = new THREE.Mesh(
			  new THREE.PlaneBufferGeometry(2, 2),
			  new THREE.MeshBasicMaterial({map: videoTex, side: THREE.DoubleSide})
			);

			// The video plane shouldn't care about the z-buffer.
			plane.material.depthTest = false;
			plane.material.depthWrite = false;

			// Create a camera and a scene for the video plane and
			// add the camera and the video plane to the scene.
			var videoCamera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1);
			var videoScene = new THREE.Scene();
			videoScene.add(plane);
			videoScene.add(videoCamera);

			if (this.orientation === 'portrait') {
				plane.rotation.z = Math.PI/2;
			}

			var scene = new THREE.Scene();
			var camera = new THREE.Camera();
			camera.matrixAutoUpdate = false;
			camera.projectionMatrix.elements.set(this.getCameraMatrix());

			scene.add(camera);


			var self = this;

			return {
				scene: scene,
				videoScene: videoScene,
				camera: camera,
				videoCamera: videoCamera,

				arController: this,

				video: video,

				process: function() {
					for (var i in self.threePatternMarkers) {
						self.threePatternMarkers[i].visible = false;
					}
					for (var i in self.threeBarcodeMarkers) {
						self.threeBarcodeMarkers[i].visible = false;
					}
					for (var i in self.threeMultiMarkers) {
						self.threeMultiMarkers[i].visible = false;
						for (var j=0; j<self.threeMultiMarkers[i].markers.length; j++) {
							if (self.threeMultiMarkers[i].markers[j]) {
								self.threeMultiMarkers[i].markers[j].visible = false;
							}
						}
					}
					self.process(video);
				},

				renderOn: function(renderer) {
					videoTex.needsUpdate = true;

					var ac = renderer.autoClear;
					renderer.autoClear = false;
					renderer.clear();
					renderer.render(this.videoScene, this.videoCamera);
					renderer.render(this.scene, this.camera);
					renderer.autoClear = ac;
				}
			};
		};


		/**
			Creates a Three.js marker Object3D for the given marker UID.
			The marker Object3D tracks the marker pattern when it's detected in the video.

			Use this after a successful artoolkit.loadMarker call:

			arController.loadMarker('/bin/Data/patt.hiro', function(markerUID) {
				var markerRoot = arController.createThreeMarker(markerUID);
				markerRoot.add(myFancyHiroModel);
				arScene.scene.add(markerRoot);
			});

			@param {number} markerUID The UID of the marker to track.
			@param {number} markerWidth The width of the marker, defaults to 1.
			@return {THREE.Object3D} Three.Object3D that tracks the given marker.
		*/
		ARController.prototype.createThreeMarker = function(markerUID, markerWidth) {
			this.setupThree();
			var obj = new THREE.Object3D();
			obj.markerTracker = this.trackPatternMarkerId(markerUID, markerWidth);
			obj.matrixAutoUpdate = false;
			this.threePatternMarkers[markerUID] = obj;
			return obj;
		};

		/**
			Creates a Three.js marker Object3D for the given multimarker UID.
			The marker Object3D tracks the multimarker when it's detected in the video.

			Use this after a successful arController.loadMarker call:

			arController.loadMultiMarker('/bin/Data/multi-barcode-4x3.dat', function(markerUID) {
				var markerRoot = arController.createThreeMultiMarker(markerUID);
				markerRoot.add(myFancyMultiMarkerModel);
				arScene.scene.add(markerRoot);
			});

			@param {number} markerUID The UID of the marker to track.
			@return {THREE.Object3D} Three.Object3D that tracks the given marker.
		*/
		ARController.prototype.createThreeMultiMarker = function(markerUID) {
			this.setupThree();
			var obj = new THREE.Object3D();
			obj.matrixAutoUpdate = false;
			obj.markers = [];
			this.threeMultiMarkers[markerUID] = obj;
			return obj;
		};

		/**
			Creates a Three.js marker Object3D for the given barcode marker UID.
			The marker Object3D tracks the marker pattern when it's detected in the video.

			var markerRoot20 = arController.createThreeBarcodeMarker(20);
			markerRoot20.add(myFancyNumber20Model);
			arScene.scene.add(markerRoot20);

			var markerRoot5 = arController.createThreeBarcodeMarker(5);
			markerRoot5.add(myFancyNumber5Model);
			arScene.scene.add(markerRoot5);

			@param {number} markerUID The UID of the barcode marker to track.
			@param {number} markerWidth The width of the marker, defaults to 1.
			@return {THREE.Object3D} Three.Object3D that tracks the given marker.
		*/
		ARController.prototype.createThreeBarcodeMarker = function(markerUID, markerWidth) {
			this.setupThree();
			var obj = new THREE.Object3D();
			obj.markerTracker = this.trackBarcodeMarkerId(markerUID, markerWidth);
			obj.matrixAutoUpdate = false;
			this.threeBarcodeMarkers[markerUID] = obj;
			return obj;
		};

		ARController.prototype.setupThree = function() {
			if (this.THREE_JS_ENABLED) {
				return;
			}
			this.THREE_JS_ENABLED = true;

			/*
				Listen to getMarker events to keep track of Three.js markers.
			*/
			this.addEventListener('getMarker', function(ev) {
				var marker = ev.data.marker;
				var obj;
				if (ev.data.type === artoolkit.PATTERN_MARKER) {
					obj = this.threePatternMarkers[ev.data.marker.idPatt];

				} else if (ev.data.type === artoolkit.BARCODE_MARKER) {
					obj = this.threeBarcodeMarkers[ev.data.marker.idMatrix];

				}
				if (obj) {
					obj.matrix.elements.set(ev.data.matrix);
					obj.visible = true;
				}
			});

			/*
				Listen to getMultiMarker events to keep track of Three.js multimarkers.
			*/
			this.addEventListener('getMultiMarker', function(ev) {
				var obj = this.threeMultiMarkers[ev.data.multiMarkerId];
				if (obj) {
					obj.matrix.elements.set(ev.data.matrix);
					obj.visible = true;
				}
			});

			/*
				Listen to getMultiMarkerSub events to keep track of Three.js multimarker submarkers.
			*/
			this.addEventListener('getMultiMarkerSub', function(ev) {
				var marker = ev.data.multiMarkerId;
				var subMarkerID = ev.data.markerIndex;
				var subMarker = ev.data.marker;
				var obj = this.threeMultiMarkers[marker];
				if (obj && obj.markers && obj.markers[subMarkerID]) {
					var sub = obj.markers[subMarkerID];
					sub.matrix.elements.set(ev.data.matrix);
					sub.visible = (subMarker.visible >= 0);
				}
			});

			/**
				Index of Three.js pattern markers, maps markerID -> THREE.Object3D.
			*/
			this.threePatternMarkers = {};

			/**
				Index of Three.js barcode markers, maps markerID -> THREE.Object3D.
			*/
			this.threeBarcodeMarkers = {};

			/**
				Index of Three.js multimarkers, maps markerID -> THREE.Object3D.
			*/
			this.threeMultiMarkers = {};
		};

	};


	var tick = function() {
		console.log(Date.now(), "tick fucntion");
		if (window.ARController && window.THREE) {
			integrate();
			if (window.ARThreeOnLoad) {
				window.ARThreeOnLoad();
			}
		} else {
			setTimeout(tick, 50);
		}			
	};
console.log(Date.now(), "START INTEGRATE");
	tick();

})();
