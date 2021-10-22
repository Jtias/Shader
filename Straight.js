var gl;
var canvas;
var vao;
var program;

//Collect shape information 
var shapes = {
   solidCube: { points: [], normals: [], start: 0, size: 0, type: 0 },
};

var near = 0.3;
var far = 20.0;
var fovy = 55.0; 
var aspect = 1.0;


var ambientProduct;
var diffuseProduct;
var specularProduct;

var lightPosition = vec4(10.0, 4.0, 10.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

//Define points 
var cubeVerts = [
   [ 0.5, 0.5, 0.5, 1], //0
   [ 0.5, 0.5,-0.5, 1], //1
   [ 0.5,-0.5, 0.5, 1], //2
   [ 0.5,-0.5,-0.5, 1], //3
   [-0.5, 0.5, 0.5, 1], //4
   [-0.5, 0.5,-0.5, 1], //5
   [-0.5,-0.5, 0.5, 1], //6
   [-0.5,-0.5,-0.5, 1], //7
];

//Solid Cube lookups
var solidCubeLookups = [
   0, 4, 6,   0, 6, 2, //front
   1, 0, 2,   1, 2, 3, //right
   5, 1, 3,   5, 3, 7, //back
   4, 5, 7,   4, 7, 6, //left
   4, 0, 1,   4, 1, 5, //top
   6, 7, 3,   6, 3, 2, //bottom
];

//Expand Solid Cube data: 
var faceNum = 0;
var normalsList = [vec3( 0.0, 0.0, 1.0), vec3( 1.0, 0.0, 0.0), vec3( 0.0, 0.0,-1.0),
                   vec3(-1.0, 0.0, 0.0), vec3( 0.0, 1.0, 0.0), vec3( 0.0,-1.0, 0.0)];
for (var i = 0; i < solidCubeLookups.length; i++) {
   shapes.solidCube.points.push(cubeVerts[solidCubeLookups[i]]);
   shapes.solidCube.normals.push(normalsList[faceNum]);
   if (i % 6 == 5) faceNum++;
}

var points = [];
var normals = [];
function loadShape(myShape, type) {
   myShape.start = points.length;
   points = points.concat(myShape.points);
   normals = normals.concat(myShape.normals);
   myShape.size = myShape.points.length;
   myShape.type = type;
}

var red =      vec4(1.0, 0.0, 0.0, 1.0);
var green =    vec4(0.0, 1.0, 0.0, 1.0);
var blue =     vec4(0.0, 0.0, 1.0, 1.0);
var lightred = vec4(1.0, 0.5, 0.5, 1.0);
var lightgreen= vec4(0.5, 1.0, 0.5, 1.0);
var lightblue = vec4(0.5, 0.5, 1.0, 1.0);
var white =    vec4(1.0, 1.0, 1.0, 1.0);
var black =    vec4(0.0, 0.0, 0.0, 1.0);


//Variables for Transformation Matrices
var mv = new mat4();
var p = new mat4();
var mvLoc, projLoc;


//Variables for Lighting
var light;
var material;
var lighting;
var uColor;



//----------------------------------------------------------------------------
// Initialization Event Function
//----------------------------------------------------------------------------
window.onload = function init() {
   // Set up a WebGL Rendering Context in an HTML5 Canvas
   canvas = document.getElementById("gl-canvas");
   gl = canvas.getContext("webgl2"); // basic webGL2 context
   if (!gl) {
      canvas.parentNode.innerHTML("Cannot get WebGL2 Rendering Context");
   }

   //  Configure WebGL
   //  eg. - set a clear color
   //      - turn on depth testing
   gl.clearColor(0.0, 0.0, 0.0, 1.0);
   gl.enable(gl.DEPTH_TEST);

   //  Load shaders and initialize attribute buffers
   program = initShaders(gl, "Shaders/diffuse.vert", "Shaders/diffuse.frag");
   gl.useProgram(program);

   ambientProduct = mult(lightAmbient, materialAmbient);
   diffuseProduct = mult(lightDiffuse, materialDiffuse);
   specularProduct = mult(lightSpecular, materialSpecular);

   // Set up local data buffers
   // Mostly done globally or with urgl in this program...
   loadShape(shapes.solidCube, gl.TRIANGLES);



   // Load the data into GPU data buffers and
   // Associate shader attributes with corresponding data buffers
   //***Vertices***
   vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
   program.vPosition = gl.getAttribLocation(program, "vPosition");
   gl.vertexAttribPointer(program.vPosition, 4, gl.FLOAT, gl.FALSE, 0, 0);
   gl.enableVertexAttribArray(program.vPosition);


   //***Normals***
   normalBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
   program.vNormal = gl.getAttribLocation(program, "vNormal");
   gl.vertexAttribPointer(program.vNormal, 3, gl.FLOAT, gl.FALSE, 0, 0);
   gl.enableVertexAttribArray(program.vNormal);


   // Get addresses of transformation uniforms
   projLoc = gl.getUniformLocation(program, "p");
   mvLoc = gl.getUniformLocation(program, "mv");

   //Set up viewport
   gl.viewportWidth = canvas.width;
   gl.viewportHeight = canvas.height;
   gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

   //Set up projection matrix
   p = perspective(45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
   gl.uniformMatrix4fv(projLoc, gl.FALSE, flatten(transpose(p)));


   // Get  light uniforms
   light = {};   // initialize this light object
   light.diffuse = gl.getUniformLocation(program, "light.diffuse");
   light.specular = gl.getUniformLocation(program, "light.specular");
   light.ambient = gl.getUniformLocation(program, "light.ambient");
   light.position = gl.getUniformLocation(program, "light.position");


   // Get material uniforms
   material = {};
   material.diffuse = gl.getUniformLocation(program, "material.diffuse");
   material.ambient = gl.getUniformLocation(program, "material.ambient");
   material.specular = gl.getUniformLocation(program, "material.specular");
   material.shininess = gl.getUniformLocation(program, "material.shininess");

   // Get and set other lighting state
   // Enable Lighting
   lighting = gl.getUniformLocation(program, "lighting");
   gl.uniform1i(lighting, 1);

   //Set color to use when lighting is disabled
   uColor = gl.getUniformLocation(program, "uColor");
   gl.uniform4fv(uColor, white);

   //Set up uofrGraphics
   urgl = new uofrGraphics(gl);
   urgl.connectShader(program, "vPosition", "vNormal", "stub");

   gl.uniform4fv( gl.getUniformLocation(program, 
      "ambientProduct"),flatten(ambientProduct) );
   gl.uniform4fv( gl.getUniformLocation(program, 
      "diffuseProduct"),flatten(diffuseProduct) );
   gl.uniform4fv( gl.getUniformLocation(program, 
      "specularProduct"),flatten(specularProduct) );	
   gl.uniform4fv( gl.getUniformLocation(program, 
      "lightPosition"),flatten(lightPosition) );
   gl.uniform1f( gl.getUniformLocation(program, 
      "shininess"),materialShininess );

   requestAnimationFrame(render);
};



//----------------------------------------------------------------------------
// Rendering Event Function
//----------------------------------------------------------------------------
var rx = 0, ry = 0;
function render() {
   gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
   
   // Set up some default light properties
   gl.uniform4fv(light.diffuse, white);
   gl.uniform4fv(light.ambient, vec4(0.2, 0.2, 0.2, 1.0));
   //var lpos = vec4(0.0, 0.0, 1.0, 0.0);
   gl.uniform4fv(light.position, lightPosition);
   
   //Set initial view
   var eye = vec3(-4.0, 8.0, 5.0);
   var at = vec3(0, 0.75 , 0);
   var up = vec3(0.0, 1.0, 0.0);
   
   
   mv = lookAt(eye, at, up);
   //p = ortho(left, right, bottom, ytop, near, far);
   
   //var mv = new mat4();
   //mv = mult(mv, translate(0,0,-.1));
   requestAnimationFrame(render);
   
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(mv)));
   var rez = 50;
   
   //Set up some default material properties
   gl.uniform4fv(material.diffuse, lightred);
   gl.uniform4fv(material.ambient, lightred);
   //DRAW SPHERE 
   var sphereTF = mult(mv, translate(0, 1, 0));
   sphereTF = mult(sphereTF,scale(1,1,1));
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(sphereTF)));
   urgl.drawSolidSphere(1, rez, rez);
   
   
   //Set up some default material properties
   gl.uniform4fv(material.diffuse, lightgreen);
   gl.uniform4fv(material.ambient, lightgreen);
   //DRAW BUILDING 1
   cubeTF = mult(mv,translate(1.5,1.5,0.0));
   cubeTF = mult(cubeTF,scale(1,3,1));
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(cubeTF)));
   gl.drawArrays(shapes.solidCube.type, shapes.solidCube.start, shapes.solidCube.size);
   
   //Set up some default material properties
   gl.uniform4fv(material.diffuse, red);
   gl.uniform4fv(material.ambient, red);
   //DRAW BUILDING 2
   cubeTF = mult(mv,translate(-1.5,0.75,0.0));
   cubeTF = mult(cubeTF,scale(1,1.5,1));
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(cubeTF)));
   gl.drawArrays(shapes.solidCube.type, shapes.solidCube.start, shapes.solidCube.size);
   
   //Set up some default material properties
   gl.uniform4fv(material.diffuse, blue);
   gl.uniform4fv(material.ambient, blue);
   //DRAW BUILDING 3
   cubeTF = mult(mv,translate(0,0.5,1.5));
   cubeTF = mult(cubeTF,scale(2,1,1));
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(cubeTF)));
   gl.drawArrays(shapes.solidCube.type, shapes.solidCube.start, shapes.solidCube.size);
   
   //Set up some default material properties
   gl.uniform4fv(material.diffuse, green);
   gl.uniform4fv(material.ambient, green);
   //DRAW BUILDING 4
   cubeTF = mult(mv,translate(0,0.5,-1.5));
   cubeTF = mult(cubeTF,scale(2,1,1));
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(cubeTF)));
   gl.drawArrays(shapes.solidCube.type, shapes.solidCube.start, shapes.solidCube.size);
   
   //Set up some default material properties 
   gl.uniform4fv(material.diffuse, red);
   gl.uniform4fv(material.ambient, red);
   //DRAW FLOOR
   cubeTF = mult(mv,translate(0,0,0));
   cubeTF = mult(cubeTF,scale(10, 0,10));
   gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(cubeTF)));
   gl.drawArrays(shapes.solidCube.type, shapes.solidCube.start, shapes.solidCube.size);
   
   
   //requestAnimationFrame(render);
}

