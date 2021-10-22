#version 300 es
//diffuse and ambient lighting shader

//inputs
in vec4 vPosition;
in vec3 vNormal;

//outputs
out vec4 color;

//structs
struct _light
{
    vec4 diffuse;
    vec4 specular;
    vec4 ambient;
    vec4 position;
};

struct _material
{
    vec4 diffuse;
    vec4 ambient;
    vec4 specular;
    float shininess;
};


//uniforms
uniform mat4 p;     // perspective matrix
uniform mat4 mv;    // modelview matrix
uniform bool lighting;  // to enable and disable lighting
uniform vec4 uColor;    // colour to use when lighting is disabled
uniform _light light; // light properties
uniform _material material; // material properties

//globals
vec4 mvPosition; // unprojected vertex position
vec3 N; // fixed surface normal
mat4 Nm; // normal matrix
vec3 mvN; // transformed normal

void main() 
{
  //Transform the point
  mvPosition = mv*vPosition;  //mvPosition is used often
  gl_Position = p*mvPosition; 

  //Construct a normal matrix to fix non-uniform scaling issues
  Nm = transpose(inverse(mv));
  //Transform the normal
  mvN = (Nm*vec4(vNormal,0.0)).xyz;

  //Color
  if (lighting == false) 
  {
	color = uColor;
  }
  else
  {
        //Make sure the normal is actually unit length, 
        //and isolate the important coordinates
        N = normalize(mvN);
        
        //Set up light direction for positional lights
        vec3 L;
        
        //If the light position is a vector, use that as the direction
        if (light.position.w == 0.0) 
            L = normalize(light.position.xyz);
        //Otherwise, the direction is a vector from the current vertex to the light
        else
            L = normalize(light.position.xyz - mvPosition.xyz);

       
        //Calculate diffuse coefficient
        float Kd = max(dot(L,N), 0.0);

        //Calculate colour for this light
        color = Kd * material.diffuse * light.diffuse +
                material.ambient * light.ambient;  
    }
}