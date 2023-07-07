// 全局变量
var gl;				// WebGL上下文
var program; 		// shader program

var mvStack = [];  // 模视投影矩阵栈，用数组实现，初始为空
var matCamera = mat4();	 // 照相机变换，初始为恒等矩阵
var matReverse = mat4(); // 照相机变换的逆变换，初始为恒等矩阵

var yRot = 0.0;        // 用于动画的旋转角
var deltaAngle = 60.0; // 每秒旋转角度
var ctx;
var matMV;
// 用于保存W、S、A、D四个方向键的按键状态的数组
var keyDown = [false, false, false, false];
var currentAngle = [0.0,0.0];
var dragging = false;
var currentAngleX = 0.0;
var dx = 3.0;
var dy = 3.0;
var g = 9.8;				// 重力加速度
var initSpeed = 4; 			// 初始速度 
var jumping = false;	    // 是否处于跳跃过程中
var jumpY = 0;          	// 当前跳跃的高度
var jumpTime = 0;			// 从跳跃开始经历的时间


var Light = function()
{
	//光源位置/方向（默认为斜上方方向光源）
	this.pos = vec4(1.0, 1.0, 1.0, 0.0);
	this.ambient = vec3(0.2, 0.2, 0.2);  //环境光
	this.diffuse = vec3(1.0, 1.0, 1.0);  //漫反射光
	this.specular = vec3(1.0, 1.0, 1.0); //镜面反射光
	this.on = true;
}


var lights = [];  //光源数组
var lightSun = new Light();  //使用默认光源属性
var lightRed = new Light();  //蓝色位置光源
var lightYellow = new Light();//黄色手电筒光源

//用于检测是否拿到物品
HaveKey = false;

var modelPosition = { x: -1, y: 0, z: 0 };
var modelPosition2 = { x: -1, y: 0, z: 0 };
var direction = 1; // 移动的方向，1表示向正方向移动，-1表示向负方向移动

var rotY = rotateY(-90);  // 创建绕X轴旋转90度的矩阵，用于控制obj模型的旋转
var rotX = rotateX(-90);  // 创建绕X轴旋转90度的矩阵，用于控制obj模型的旋转

var doorOpen = false;
1

//解密
var decrypt=[-1,-1,-1,-1,-1,-1];//键盘输入存储
var isTypingPassword = false;//当前是否正在输入密码
var isPasswordFull = false;//密码是否完整
var isPassowrdRight = false;//密码是否正确

var gameOver = false;



//光源属性初始化
function initLights()
{
	lights.push(lightSun);
	//红色光源
	lightRed.pos = vec4(0.0, 0.0, 0.0, 1.0); //光源位置（建模坐标系）
	lightRed.ambient = vec3(0.1, 0.1, 0.1);  //环境光
	lightRed.diffuse = vec3(1.0, 1.0, 1.0);  //漫反射光
	lightRed.specular = vec3(1.0, 1.0, 1.0); //镜面漫反射
	lights.push(lightRed);
	
	//手电筒光源
	lightYellow.pos = vec4(0.0, 0.0, 0.0, 1.0);  //光源位置（观察坐标系）
	lightYellow.ambient = vec3(0.0, 0.0, 0.0);  //照射面积小，不给环境光了
	lightYellow.diffuse = vec3(1.0, 1.0, 1.0);  //漫反射光，黄色
	lightYellow.specular = vec3(1.0, 1.0, 0.0); //镜面漫反射，黄色
	lights.push(lightYellow);
	
	//为programObj中光源属性传值
	gl.useProgram(programObj);
	var ambientLight = [];
	ambientLight.push(lightSun.ambient);
	ambientLight.push(lightRed.ambient);
	ambientLight.push(lightYellow.ambient);
	gl.uniform3fv(programObj.u_AmbientLight, flatten(ambientLight));
	var diffuseLight = [];
	diffuseLight.push(lightSun.diffuse);
	diffuseLight.push(lightRed.diffuse);
	diffuseLight.push(lightYellow.diffuse);
	gl.uniform3fv(programObj.u_DiffuseLight, flatten(diffuseLight));
	var specularLight = [];
	specularLight.push(lightSun.specular);
	specularLight.push(lightRed.specular);
	specularLight.push(lightYellow.specular);
	gl.uniform3fv(programObj.u_SpecularLight, flatten(specularLight));
	gl.uniform3fv(programObj.u_SpotDirection, flatten(vec3(0.0, 0.0, -1.0)));
	gl.uniform1f(programObj.u_SpotCutOff, 8);
	gl.uniform1f(programObj.u_SpotExponent, 3);
	
	//给聚光灯参数传值
	gl.useProgram(program);
	gl.uniform3fv(program.u_SpotDirection, flatten(vec3(0.0, 0.0, -1.0)));  //往-z轴照
	gl.uniform1f(program.u_SpotCutOff, 8);  //设置截止角
	gl.uniform1f(program.u_SpotExponent, 3); //设衰减指数
	
	passLightsOn();  //光源开关
}



//光源开关传值
function passLightsOn()
{
	var lightsOn = [];
	for(var i=0; i<lights.length; i++)
	{
		if(lights[i].on)
		{
			lightsOn[i] = 0;
		}
		else
		{
			lightsOn[i] = 1;
		}
	}
	gl.useProgram(program);
	gl.uniform1iv(program.u_LightOn, lightsOn);
	gl.useProgram(programObj);
	gl.uniform1iv(programObj.u_LightOn, lightsOn);
}

	
	
//材质对象
//构造函数，各属性有默认值
var MaterialObj = function()
{
	this.ambient = vec3(0.0, 0.0, 0.0);  //环境反射系数
	this.diffuse = vec3(0.8, 0.8, 0.8);  //漫反射系数
	this.specular = vec3(0.0, 0.0, 0.0); //镜面反射系数
	this.emission = vec3(0.0, 0.0, 0.0); //发射光
	this.shininess = 10;                 //高光系数
	this.alpha = 1.0;  //透明度，默认完全不透明
}


var mtlRedLight = new MaterialObj();  //红色光源球使用的材质对象
//设置红色光源球的材质属性
mtlRedLight.ambient = vec3(0.1, 0.1, 0.1);  //环境反射系数
mtlRedLight.diffuse = vec3(0.2, 0.2, 0.2);  //漫反射系数
mtlRedLight.specular = vec3(0.2, 0.2, 0.2); //镜面反射系数
mtlRedLight.emission = vec3(0.0, 0.0, 0.0); //发射光
mtlRedLight.shininess = 150;                //高光系数


//红色光源关闭时光源球使用的材质对象
var mtlRedLightOff = new MaterialObj();
//设置红色光源球的材质属性（光源关闭时）
mtlRedLightOff.ambient = vec3(0.1, 0.1, 0.1);  //环境反射系数
mtlRedLightOff.diffuse = vec3(0.8, 0.8, 0.8);  //漫反射系数
mtlRedLightOff.specular = vec3(0.2, 0.2, 0.2); //镜面反射系数
mtlRedLightOff.emission = vec3(0.0, 0.0, 0.0); //发射光
mtlRedLightOff.shininess = 150;                 //高光系数
mtlRedLightOff.alpha = 0.5;   //透明度



// 定义Obj对象
// 构造函数
var Obj = function(){
	this.numVertices = 0; 		// 顶点个数
	this.vertices = new Array(0);   // 用于保存顶点数据的数组
	this.normals = new Array(0);    // 用于保存法向数据的数组
	this.texcoords = new Array(0);  //用于保存纹理坐标数据的数组
	
	this.vertexBuffer = null;	// 存放顶点数据的buffer对象
	this.normalBuffer = null;	// 存放法向数据的buffer对象
	this.texBuffer = null;      //存放纹理坐标数据的buffer对象
	
	this.material = new MaterialObj();  //材质
	this.texObj = null;  //Texture对象
}



//纹理对象（自定义对象，并非WebGl的纹理对象）
var TextureObj = function(pathName, format, mipmapping)
{
	this.path = pathName;  //纹理图文件路径
	this.format = format;  //数据格式
	this.mipmapping = mipmapping;  //是否启用mipmapping
	this.texture = null;  //WebGL纹理对象
	this.complete = false;  //是否已完成文件加载
}



//创建纹理对象，加载纹理图
//参数为文件路径、纹理图格式（gl.RGB、gl.RGBS等）
//以及是否启用mipmapping
//返回Texture对象
function loadTexture(path,format,mipmapping)
{
	//新建一个Texture对象
	var texObj = new TextureObj(path, format, mipmapping);
	
	var image = new Image();  //创建一个image对象
	if(!image)
	{
		console.log("创建image对象失败！");
		return false;
	}
	//注册图像文件加载完毕时间的相应函数
	image.onload = function()
	{
		console.log("纹理图" + path + "加载完毕");
		//初始化纹理对象
		initTexture(texObj, image);
		textureLoaded++;  //增加已加载纹理数
		//已加载纹理数如果等于总纹理数，则可以开始绘制了
		if(textureLoaded == numTextures)
		{
			requestAnimFrame(render);  //请求重绘
		}
	};
	//指定图像源，此时浏览器开始加载图像
	image.src = path;
	console.log("开始加载纹理图:" + path);
	return texObj;
}



//初始化纹理对象
function initTexture(texObj, image)
{
	texObj.texture = gl.createTexture();  //创建纹理对象
	if(!texObj.texture)
	{
		console.log("创建纹理对象失败！");
		return false;
	}
	//绑定纹理对象
	gl.bindTexture(gl.TEXTURE_2D,texObj.texture);
	
	//在加载纹理对象时对其y轴反转
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
	
	//加载纹理图像
	gl.texImage2D(gl.TEXTURE_2D,
				  0,
				  texObj.format,
				  texObj.format,
				  gl.UNSIGNED_BYTE,
				  image);
	if(texObj.mipmapping)  //开启了mipmapping?
	{
		//自动生成各级分辨率的纹理图
		gl.generateMipmap(gl.TEXTURE_2D);
		//设置插值方式
		gl.texParameteri(gl.TEXTURE_2D,
						 gl.TEXTURE_MIN_FILTER,
						 gl.LINEAR_MIPMAP_LINEAR);
	}
	else
	{
		gl.texParameteri(gl.TEXTURE_2D,
						 gl.TEXTURE_MIN_FILTER,
						 gl.LINEAR);
	}
	texObj.complete = true;  //纹理对象初始化完毕
}



var numCompleted = 0; // Mipmapping纹理图加载完成的张数



// 创建纹理对象，加载Mipmapping各级纹理图
// 参数为文件路径数组、纹理图格式(gl.RGB、gl.RGBA等)
function loadMipmappingTextures(pathArray, format){
	//加载第一张图的的路径，图片的格式，是否MIP贴图
	var texObj = new TextureObj(pathArray[0], format, true);
	
	texObj.texture = gl.createTexture(); // 创建纹理对象
	//绑定当前的上下文
	if(!texObj.texture){
		console.log("创建纹理对象失败!");
		return false;
	}
		
	// 绑定纹理对象
	gl.bindTexture(gl.TEXTURE_2D, texObj.texture);
	
	// 设置插值方式（当纹理被缩小的时候，使用双线性插值并使用从分辨率最接近的某级纹理图中采样线性插值法）
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
		gl.LINEAR_MIPMAP_NEAREST);
	
	// 读取每一级分辨率的图像
	//使用loadMipmappingTexture函数加载每一个级别的纹理图，纹理对象，文件路径数组，i-当前纹理级别
	for(var i = 0; i < pathArray.length; i++)
		loadMipmappingTexture(texObj, pathArray, i);
	
	return texObj;
}



// 加载一级纹理图
function loadMipmappingTexture(texObj, pathArray, i){
	var image = new Image();	// 创建一个image对象
	if(!image){
		console.log("创建image对象失败!");
		return false;
	}
		
	// 注册图像加载事件的响应函数，当图像加载完毕后回自动触发
	image.onload = function(){
		console.log("纹理图" + pathArray[i] + "加载完毕");
		//在图片加载完毕后执行initMipmappingTexture()函数将纹理对象，图像以及层级传递
			
		initMipmappingTexture(texObj, image, i);
			
		// 各级纹理图是否已全部初始化完毕
		numCompleted++;
		if(numCompleted == pathArray.length){
			texObj.complete = true;
			console.log("mipmapping纹理全部加载完毕");
		}
		//完成一次纹理图加载，增加已加载纹理数
		textureLoaded++; 
		// 已加载纹理数如果等于总纹理数
		// 则可以开始绘制了
		if(textureLoaded == numTextures) 
			requestAnimFrame(render); // 请求重绘
	};
		
	// 浏览器开始加载图像
	image.src = pathArray[i];
	console.log("开始加载纹理图：" + pathArray[i]);
}



// 初始化一级纹理图
// 参数i为纹理图的级别
function initMipmappingTexture(texObj, image, i){
	// 绑定纹理对象
	gl.bindTexture(gl.TEXTURE_2D, texObj.texture);
	
	// 在加载纹理图像时对其沿y轴反转
	//像素的坐标系原点通常为左下角，而一些常用的图像格式（如 PNG 和 JPEG）的原点通常为左上角。
	//为了将这些图像应用到 WebGL 中，需要对其进行沿 y 轴翻转。
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 
	
	// 加载纹理图像
	gl.texImage2D(gl.TEXTURE_2D, i, texObj.format, 
		texObj.format, gl.UNSIGNED_BYTE, image);
}



// 初始化缓冲区对象(VBO)
Obj.prototype.initBuffers = function(){
	/*创建并初始化顶点坐标缓冲区对象(Buffer Object)*/
	// 创建缓冲区对象，存于成员变量vertexBuffer中
	this.vertexBuffer = gl.createBuffer(); 
	// 将vertexBuffer绑定为当前Array Buffer对象
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	// 为Buffer对象在GPU端申请空间，并提供数据
	gl.bufferData(gl.ARRAY_BUFFER,	// Buffer类型
		flatten(this.vertices),		// 数据来源
		gl.STATIC_DRAW	// 表明是一次提供数据，多遍绘制
		);
	// 顶点数据已传至GPU端，可释放内存
	this.vertices.length = 0; 
	
	//创建并初始化法向缓冲区对象(Buffer Object)
	if(this.normals.length!=0)
	{
		// 创建缓冲区对象，存于成员变量normalBuffer中
		this.normalBuffer=gl.createBuffer();
		// 将normalBuffer绑定为当前Array Buffer对象
		gl.bindBuffer(gl.ARRAY_BUFFER,this.normalBuffer);
		// 为Buffer对象在GPU端申请空间，并提供数据
		gl.bufferData(
						gl.ARRAY_BUFFER,	    // Buffer类型
						flatten(this.normals),  // 数据来源
						gl.STATIC_DRAW);	// 表明是一次提供数据，多遍绘制
		// 顶点数据已传至GPU端，可释放内存
		this.normals.length=0;
	}
	
	//创建并初始化顶点纹理坐标缓冲区对象(Buffer Object)
	if(this.texcoords.length!=0)
	{
		// 创建缓冲区对象，存于成员变量texBuffer中
		this.texBuffer=gl.createBuffer();
		// 将texBuffer绑定为当前Array Buffer对象
		gl.bindBuffer(gl.ARRAY_BUFFER,this.texBuffer);
		// 为Buffer对象在GPU端申请空间，并提供数据
		gl.bufferData(gl.ARRAY_BUFFER,	        // Buffer类型
					  flatten(this.texcoords),	// 数据来源
					  gl.STATIC_DRAW);	// 表明是一次提供数据，多遍绘制
		// 顶点数据已传至GPU端，可释放内存
		this.texcoords.length=0;
	}
}



// 绘制几何对象
// 参数为模视矩阵
Obj.prototype.draw = function(matMV,material,tmpTexObj){
	// 设置为a_Position提供数据的方式
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	// 为顶点属性数组提供数据(数据存放在vertexBuffer对象中)
	gl.vertexAttribPointer( 
		program.a_Position,	// 属性变量索引
		3,					// 每个顶点属性的分量个数
		gl.FLOAT,			// 数组数据类型
		false,				// 是否进行归一化处理
		0,   // 在数组中相邻属性成员起始位置间的间隔(以字节为单位)
		0    // 第一个属性值在buffer中的偏移量
		);
	// 为a_Position启用顶点数组
	gl.enableVertexAttribArray(program.a_Position);	
	
	// // 传颜色
	// gl.uniform3fv(program.u_Color, flatten(this.color));
	
	//设置为a_Normal提供数据的方式
	if(this.normalBuffer != null)
	{
		//为顶点属性数组提供数据（数据存放在normalBuffer对象中）
		gl.bindBuffer(gl.ARRAY_BUFFER,this.normalBuffer);
		gl.vertexAttribPointer(
								program.a_Normal,  //属性变量索引
								3,                 //每个顶点属性的分量个数
								gl.FLOAT,          //数组数据类型
								false,             //是否进行归一化处理
								0,                 //在数组中相邻属性成员起始位置间的间隔（以字节为单位）
								0);                //第一个属性值在buffer中的偏移量
		// 为a_Normal启用顶点数组
		gl.enableVertexAttribArray(program.a_Normal);
	}
	
	//设置为a_Texcoord提供数据的方式
	if(this.texBuffer != null)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER,this.texBuffer);
		//为顶点属性数组提供数据（数据存放在texBuffer对象中）
		gl.vertexAttribPointer(
								program.a_Texcoord,  //属性变量索引
								2,                 //每个顶点属性的分量个数
								gl.FLOAT,          //数组数据类型
								false,             //是否进行归一化处理
								0,                 //在数组中相邻属性成员起始位置间的间隔（以字节为单位）
								0);                //第一个属性值在buffer中的偏移量
		// 为a_Texcoord启用顶点数组
		gl.enableVertexAttribArray(program.a_Texcoord);
	}
	
	//设置材质属性
	var mtl;
	if(arguments.length>1 && arguments[1]!=null)  //提供了材质
	{
		mtl = material;
	}
	else
	{
		mtl = this.material;
	}
	
	//设置材质属性
	var ambientProducts = [];
	var diffuseProducts = [];
	var specularProducts = [];
	for(var i=0; i<lights.length; i++)
	{
		ambientProducts.push(mult(lights[i].ambient, mtl.ambient));
		diffuseProducts.push(mult(lights[i].diffuse, mtl.diffuse));
		specularProducts.push(mult(lights[i].specular, mtl.specular));
	}
	
	gl.uniform3fv(program.u_AmbientProduct, flatten(ambientProducts));
	gl.uniform3fv(program.u_DiffuseProduct, flatten(diffuseProducts));
	gl.uniform3fv(program.u_SpecularProduct, flatten(specularProducts));
	gl.uniform3fv(program.u_Emission, flatten(mtl.emission));
	gl.uniform1f(program.u_Shininess, mtl.shininess);
	gl.uniform1f(program.u_Alpha, mtl.alpha);
	
	//参数有提供纹理对象则用参数提供的纹理对象，否则用对象自己的纹理对象
	var texObj;
	if(arguments.length>2 && arguments[2]!=null)  //提供了纹理对象
	{
		texObj = tmpTexObj;
	}
	else
	{
		texObj = this.texObj;
	}
	//纹理对象不为空则绑定纹理对象
	if(texObj!=null && texObj.complete)
	{
		gl.bindTexture(gl.TEXTURE_2D,texObj.texture);
	}
	
	// 开始绘制
	gl.uniformMatrix4fv(program.u_ModelView, false, flatten(matMV)); // 传MV矩阵
	gl.uniformMatrix3fv(program.u_NormalMat, false, flatten(normalMatrix(matMV))); // 传法向矩阵
		
	gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
}



// 在y=0平面绘制中心在原点的格状方形地面
// fExtent：决定地面区域大小(方形地面边长的一半)
// fStep：决定线之间的间隔
// 返回地面Obj对象
function buildGround(fExtent, fStep,texScale){	
	var obj = new Obj();  // 新建一个Obj对象
	var iterations = 2 * fExtent / fStep;   //单层循环次数
	var fTexcoordStep = texScale/iterations;  //纹理坐标递增步长
	
	for(var x = -fExtent,s=0; x < fExtent; x += fStep,s+=fTexcoordStep){
		for(var z = fExtent,t=0; z > -fExtent; z -= fStep,t+=fTexcoordStep){
			// 以(x, 0, z)为左下角的单元四边形的4个顶点
			var ptLowerLeft = vec3(x, 0, z);
			var ptLowerRight = vec3(x + fStep, 0, z);
			var ptUpperLeft = vec3(x, 0, z - fStep);
			var ptUpperRight = vec3(x + fStep, 0, z - fStep);
			
			// 分成2个三角形
			obj.vertices.push(ptUpperLeft);    
			obj.vertices.push(ptLowerLeft);
			obj.vertices.push(ptLowerRight);
			obj.vertices.push(ptUpperLeft);
			obj.vertices.push(ptLowerRight);
			obj.vertices.push(ptUpperRight);
			
			//顶点法向
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			
			//纹理坐标
			obj.texcoords.push(vec2(s, t+fTexcoordStep));
			obj.texcoords.push(vec2(s, t));
			obj.texcoords.push(vec2(s+fTexcoordStep, t));
			obj.texcoords.push(vec2(s, t+fTexcoordStep));
			obj.texcoords.push(vec2(s+fTexcoordStep, t));
			obj.texcoords.push(vec2(s+fTexcoordStep, t+fTexcoordStep));
			
			obj.numVertices += 6;
		}
	}
	
	//设置地面材质
	obj.material.ambient = vec3(0.9, 0.9, 0.9);   //环境反射系数
	obj.material.diffuse = vec3(0.8, 0.8, 0.8);   //漫反射系数
	obj.material.specular = vec3(0.3, 0.3, 0.3);  //镜面反射系数
	obj.material.emission = vec3(0.0, 0.0, 0.0);  //发射光
	obj.material.shininess = 10;  				  //高光系数
	return obj;
}



// 生成立方体一个面的顶点坐标、法向数据和纹理坐标
function quad(obj,points, a, b, c, d){
	// 计算四边形的两个不平行的边向量
	var u = subtract(points[b], points[a]);
	var v = subtract(points[c], points[b]);	
	// 通过叉乘计算法向
	var normal = normalize(cross(u, v));
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(0.0, 0.0));
	obj.vertices.push(points[a]); 
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(1.0, 0.0));
	obj.vertices.push(points[b]); 
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(1.0, 1.0));
	obj.vertices.push(points[c]); 
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(0.0, 0.0));
	obj.vertices.push(points[a]); 
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(1.0, 1.0));
	obj.vertices.push(points[c]); 
	obj.normals.push(normal); 
	obj.texcoords.push(vec2(0.0, 1.0));
	obj.vertices.push(points[d]); 
}



//生成立方体的数据
function buildCube(){
	var obj = new Obj();
	obj.numVertices = 36;		// 绘制立方体使用顶点数(6个面*2个三角形*3个顶点)
	var points = [			// 立方体的8个顶点
		vec3(-0.1, -0.1,  0.1), // 左下前
		vec3(-0.1,  0.1,  0.1), // 左上前
		vec3( 0.1,  0.1,  0.1), // 右上前
		vec3( 0.1, -0.1,  0.1), // 右下前
		vec3(-0.1, -0.1, -0.1), // 左下后
		vec3(-0.1,  0.1, -0.1), // 左上后
		vec3( 0.1,  0.1, -0.1), // 右上后
		vec3( 0.1, -0.1, -0.1)  // 右下后
	];
	quad(obj,points,1, 0, 3, 2);	// 前
	quad(obj,points,2, 3, 7, 6);	// 右
	quad(obj,points,3, 0, 4, 7);	// 下
	quad(obj,points,6, 5, 1, 2);	// 上
	quad(obj,points,4, 5, 6, 7);	// 后
	quad(obj,points,5, 4, 0, 1);	// 左

	return obj;
}



// 用于生成一个中心在原点的球的顶点数据(南北极在z轴方向)
// 返回球Obj对象，参数为球的半径及经线和纬线数
function buildSphere(radius, columns, rows){
	var obj = new Obj(); // 新建一个Obj对象
	var vertices = []; // 存放不同顶点的数组

	for (var r = 0; r <= rows; r++){
		var v = r / rows;  // v在[0,1]区间
		var theta1 = v * Math.PI; // theta1在[0,PI]区间

		var temp = vec3(0, 0, 1);
		var n = vec3(temp); // 实现Float32Array深拷贝
		var cosTheta1 = Math.cos(theta1);
		var sinTheta1 = Math.sin(theta1);
		n[0] = temp[0] * cosTheta1 + temp[2] * sinTheta1;
		n[2] = -temp[0] * sinTheta1 + temp[2] * cosTheta1;
		
		for (var c = 0; c <= columns; c++){
			var u = c / columns; // u在[0,1]区间
			var theta2 = u * Math.PI * 2; // theta2在[0,2PI]区间
			var pos = vec3(n);
			temp = vec3(n);
			var cosTheta2 = Math.cos(theta2);
			var sinTheta2 = Math.sin(theta2);
			
			pos[0] = temp[0] * cosTheta2 - temp[1] * sinTheta2;
			pos[1] = temp[0] * sinTheta2 + temp[1] * cosTheta2;
			
			var posFull = mult(pos, radius);
			
			vertices.push(posFull);
		}
	}

	/*生成最终顶点数组数据(使用三角形进行绘制)*/
	var colLength = columns + 1;
	for (var r = 0; r < rows; r++){
		var offset = r * colLength;

		for (var c = 0; c < columns; c++){
			var ul = offset  +  c;						// 左上
			var ur = offset  +  c + 1;					// 右上
			var br = offset  +  (c + 1 + colLength);	// 右下
			var bl = offset  +  (c + 0 + colLength);	// 左下

			// 由两条经线和纬线围成的矩形
			// 分2个三角形来画
			obj.vertices.push(vertices[ul]); 
			obj.vertices.push(vertices[bl]);
			obj.vertices.push(vertices[br]);
			obj.vertices.push(vertices[ul]);
			obj.vertices.push(vertices[br]);
			obj.vertices.push(vertices[ur]);
			
			//球的法向与顶点坐标相同
			obj.normals.push(vertices[ul]); 
			obj.normals.push(vertices[bl]);
			obj.normals.push(vertices[br]);
			obj.normals.push(vertices[ul]);
			obj.normals.push(vertices[br]);
			obj.normals.push(vertices[ur]);
			
			//纹理坐标
			obj.texcoords.push(vec2(c/columns, r/rows));
			obj.texcoords.push(vec2(c/columns, (r+1)/rows));
			obj.texcoords.push(vec2((c+1)/columns, (r+1)/rows));
			obj.texcoords.push(vec2(c/columns, r/rows));
			obj.texcoords.push(vec2((c+1)/columns, (r+1)/rows));
			obj.texcoords.push(vec2((c+1)/columns, r/rows));
		}
	}

	vertices.length = 0; // 已用不到，释放 
	obj.numVertices = rows * columns * 6; // 顶点数
	
	//设置球材质
	obj.material.ambient = vec3(0.1, 0.1, 0.1); // 环境反射系数
	obj.material.diffuse = vec3(0.5, 1.0, 0.7); // 漫反射系数
	obj.material.specular = vec3(0.5, 0.8, 0.8);// 镜面反射系数
	obj.material.emission = vec3(0.0, 0.0, 0.0);// 发射光
	obj.material.shininess = 150;	// 高光系数
	
	return obj;
}



// 构建中心在原点的圆环(由线段构建)
// 参数分别为圆环的主半径(决定环的大小)，
// 圆环截面圆的半径(决定环的粗细)，
// numMajor和numMinor决定模型精细程度
// 返回圆环Obj对象
function buildTorus(majorRadius, minorRadius, numMajor, numMinor){
	var obj = new Obj(); // 新建一个Obj对象
	
	obj.numVertices = numMajor * numMinor * 6;  // 顶点数

	var majorStep = 2.0 * Math.PI / numMajor;
	var minorStep = 2.0 * Math.PI / numMinor;
	var sScale = 4, tScale = 2;  //两方方向上纹理坐标的缩放系数

	for(var i = 0; i < numMajor; ++i){
		var a0 = i * majorStep;
		var a1 = a0 + majorStep;
		var x0 = Math.cos(a0);
		var y0 = Math.sin(a0);
		var x1 = Math.cos(a1);
		var y1 = Math.sin(a1);
		
		//三角形条带左右顶点对应的两个圆环中心
		var center0 = mult(majorRadius, vec3(x0, y0, 0));
		var center1 = mult(majorRadius, vec3(x1, y1, 0));

		for(var j = 0; j < numMinor; ++j){
			var b0 = j * minorStep;
			var b1 = b0 + minorStep;
			var c0 = Math.cos(b0);
			var r0 = minorRadius * c0 + majorRadius;
			var z0 = minorRadius * Math.sin(b0);
			var c1 = Math.cos(b1);
			var r1 = minorRadius * c1 + majorRadius;
			var z1 = minorRadius * Math.sin(b1);

			var left0 = vec3(x0*r0, y0*r0, z0);
			var right0 = vec3(x1*r0, y1*r0, z0);
			var left1 = vec3(x0*r1, y0*r1, z1);
			var right1 = vec3(x1*r1, y1*r1, z1);
			obj.vertices.push(left0);  
			obj.vertices.push(right0); 
			obj.vertices.push(left1); 
			obj.vertices.push(left1); 
			obj.vertices.push(right0);
			obj.vertices.push(right1);
			
			//法向从圆环中心指向顶点
			obj.normals.push(subtract(left0, center0));
			obj.normals.push(subtract(right0, center1));
			obj.normals.push(subtract(left1, center0));
			obj.normals.push(subtract(left1, center0));
			obj.normals.push(subtract(right0, center1));
			obj.normals.push(subtract(right1, center1));
			
			//纹理坐标
			obj.texcoords.push(vec2(i/numMajor*sScale, j/numMinor*tScale));
			obj.texcoords.push(vec2((i+1)/numMajor*sScale, j/numMinor*tScale));
			obj.texcoords.push(vec2(i/numMajor*sScale, (j+1)/numMinor*tScale));
			obj.texcoords.push(vec2(i/numMajor*sScale, (j+1)/numMinor*tScale));
			obj.texcoords.push(vec2((i+1)/numMajor*sScale, j/numMinor*tScale));
			obj.texcoords.push(vec2((i+1)/numMajor*sScale, (j+1)/numMinor*tScale));
		}
	}
	
	//设置圆环材质
	obj.material.ambient = vec3(0.1, 0.1, 0.1); // 环境反射系数
	obj.material.diffuse = vec3(0.8, 0.4, 0.8); // 漫反射系数
	obj.material.specular = vec3(0.7, 0.7, 0.7);// 镜面反射系数
	obj.material.emission = vec3(0.0, 0.0, 0.0);// 发射光
	obj.material.shininess = 80;				// 高光系数
	return obj;
}



// 获取shader中变量位置
function getLocation(){
	/*获取shader中attribute变量的位置(索引)*/
    program.a_Position = gl.getAttribLocation(program, "a_Position");
	if(program.a_Position < 0){  // getAttribLocation获取失败则返回-1
		console.log("获取attribute变量a_Position失败！"); 
	}
	program.a_Normal = gl.getAttribLocation(program, "a_Normal");
	if(program.a_Normal < 0){  // getAttribLocation获取失败则返回-1
		console.log("获取attribute变量a_Normal失败！"); 
	}
	program.a_Texcoord = gl.getAttribLocation(program, "a_Texcoord");
	if(program.a_Texcoord < 0)
	{
		console.log("获取attribute变量a_Texcoord失败！"); 
	}
	
	/*获取shader中uniform变量的位置(索引)*/
	program.u_ModelView = gl.getUniformLocation(program, "u_ModelView");
	if(!program.u_ModelView)
	{
		console.log("获取uniform变量u_ModelView失败！");
	}
	
	program.u_Projection = gl.getUniformLocation(program, "u_Projection");
	if(!program.u_Projection)
	{
		console.log("获取uniform变量u_Projection失败！");
	}
	
	program.u_NormalMat = gl.getUniformLocation(program, "u_NormalMat");
	if(!program.u_NormalMat)
	{
		console.log("获取uniform变量u_NormalMat失败！");
	}
	
	program.u_LightPosition = gl.getUniformLocation(program, "u_LightPosition");
	if(!program.u_LightPosition)
	{
		console.log("获取uniform变量u_LightPosition失败！");
	}
	
	program.u_Shininess = gl.getUniformLocation(program, "u_Shininess");
	if(!program.u_Shininess)
	{
		console.log("获取uniform变量u_Shininess失败！");
	}
	
	program.u_AmbientProduct = gl.getUniformLocation(program, "u_AmbientProduct");
	if(!program.u_AmbientProduct)
	{
		console.log("获取uniform变量u_AmbientProduct失败！");
	}
	
	program.u_DiffuseProduct = gl.getUniformLocation(program, "u_DiffuseProduct");
	if(!program.u_DiffuseProduct)
	{
		console.log("获取uniform变量u_DiffuseProduct失败！");
	}
	
	program.u_SpecularProduct = gl.getUniformLocation(program, "u_SpecularProduct");
	if(!program.u_SpecularProduct)
	{
		console.log("获取uniform变量u_SpecularProduct失败！");
	}
	
	program.u_SpotDirection = gl.getUniformLocation(program, "u_SpotDirection");
	if(!program.u_SpotDirection)
	{
		console.log("获取uniform变量u_SpotDirection失败！");
	}
	
	program.u_SpotCutOff = gl.getUniformLocation(program, "u_SpotCutOff");
	if(!program.u_SpotCutOff)
	{
		console.log("获取uniform变量u_SpotCutOff失败！");
	}
	
	program.u_SpotExponent = gl.getUniformLocation(program, "u_SpotExponent");
	if(!program.u_SpotExponent)
	{
		console.log("获取uniform变量u_SpotExponent失败！");
	}
	
	program.u_LightOn = gl.getUniformLocation(program, "u_LightOn");
	if(!program.u_LightOn){
		console.log("获取uniform变量u_LightOn失败！"); 
	}
	
	program.u_Emission = gl.getUniformLocation(program, "u_Emission");
	if(!program.u_Emission){
		console.log("获取uniform变量u_Emission失败！"); 
	}
	
	program.u_Sampler = gl.getUniformLocation(program, "u_Sampler");
	if(!program.u_Sampler)
	{
		console.log("获取uniform变量u_Sampler失败！")
	}
	
	program.u_Alpha = gl.getUniformLocation(program, "u_Alpha");
	if(!program.u_Alpha)
	{
		console.log("获取uniform变量u_Alpha失败！")
	}
	
	program.u_bOnlyTexture = gl.getUniformLocation(program, "u_bOnlyTexture");
	if(!program.u_bOnlyTexture)
	{
		console.log("获取uniform变量u_bOnlyTexture失败！")
	}
	
	program.u_FogColor = gl.getUniformLocation(program, "u_FogColor");
	if(!program.u_FogColor)
	{
		console.log("获取uniform变量u_FogColor失败！");
	}
	
	program.u_FogDist = gl.getUniformLocation(program, "u_FogDist");
	if(!program.u_FogDist)
	{
		console.log("获取uniform变量u_FogDist失败！");
	}
	
	
	//Obj模型
	/*获取programObj中attribute变量的位置(索引)*/
    attribIndex.a_Position = gl.getAttribLocation(programObj, "a_Position");
	if(attribIndex.a_Position < 0){ // getAttribLocation获取失败则返回-1
		console.log("获取attribute变量a_Position失败！"); 
	}	
	attribIndex.a_Normal = gl.getAttribLocation(programObj, "a_Normal");
	if(attribIndex.a_Normal < 0){ // getAttribLocation获取失败则返回-1
		console.log("获取attribute变量a_Normal失败！"); 
	}	
	attribIndex.a_Texcoord = gl.getAttribLocation(programObj, "a_Texcoord");
	if(attribIndex.a_Texcoord < 0){ // getAttribLocation获取失败则返回-1
		console.log("获取attribute变量a_Texcoord失败！"); 
	}	
	
	/*获取programObj中uniform变量的位置(索引)*/
	mtlIndex.u_Ka = gl.getUniformLocation(programObj, "u_Ka");
	if(!mtlIndex.u_Ka){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Ka失败！"); 
	}
	mtlIndex.u_Kd = gl.getUniformLocation(programObj, "u_Kd");
	if(!mtlIndex.u_Kd){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Kd失败！"); 
	}
	mtlIndex.u_Ks = gl.getUniformLocation(programObj, "u_Ks");
	if(!mtlIndex.u_Ks){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Ks失败！"); 
	}
	mtlIndex.u_Ke = gl.getUniformLocation(programObj, "u_Ke");
	if(!mtlIndex.u_Ke){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Ke失败！"); 
	}
	mtlIndex.u_Ns = gl.getUniformLocation(programObj, "u_Ns");
	if(!mtlIndex.u_Ns){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Ns失败！"); 
	}
	mtlIndex.u_d = gl.getUniformLocation(programObj, "u_d");
	if(!mtlIndex.u_d){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_d失败！"); 
	}
	
	///////////////////////////////////////////////////////////////
	programObj.u_ModelView = gl.getUniformLocation(programObj, "u_ModelView");
	if(!programObj.u_ModelView){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_ModelView失败！"); 
	}	
	programObj.u_Projection = gl.getUniformLocation(programObj, "u_Projection");
	if(!programObj.u_Projection){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Projection失败！"); 
	}
	programObj.u_NormalMat = gl.getUniformLocation(programObj, "u_NormalMat");
	if(!program.u_NormalMat){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_NormalMat失败！"); 
	}
	programObj.u_LightPosition = gl.getUniformLocation(programObj, "u_LightPosition");
	if(!programObj.u_LightPosition){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_LightPosition失败！"); 
	}
	programObj.u_AmbientLight = gl.getUniformLocation(programObj, "u_AmbientLight");
	if(!programObj.u_AmbientLight){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_AmbientLight失败！"); 
	}
	programObj.u_DiffuseLight = gl.getUniformLocation(programObj, "u_DiffuseLight");
	if(!programObj.u_DiffuseLight){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_DiffuseLight失败！"); 
	}
	programObj.u_SpecularLight = gl.getUniformLocation(programObj, "u_SpecularLight");
	if(!programObj.u_SpecularLight){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_SpecularLight失败！"); 
	}
	programObj.u_SpotDirection = gl.getUniformLocation(programObj, "u_SpotDirection");
	if(!programObj.u_SpotDirection){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_SpotDirection失败！"); 
	}
	programObj.u_SpotCutOff = gl.getUniformLocation(programObj, "u_SpotCutOff");
	if(!programObj.u_SpotCutOff){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_SpotCutOff失败！"); 
	}
	programObj.u_SpotExponent = gl.getUniformLocation(programObj, "u_SpotExponent");
	if(!programObj.u_SpotExponent){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_SpotExponent失败！"); 
	}
	programObj.u_LightOn = gl.getUniformLocation(programObj, "u_LightOn");
	if(!programObj.u_LightOn){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_LightOn失败！"); 
	}
	programObj.u_Sampler = gl.getUniformLocation(programObj, "u_Sampler");
	if(!programObj.u_Sampler){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_Sampler失败！"); 
	}
	
	programObj.u_FogColor = gl.getUniformLocation(programObj, "u_FogColor");
	if(!programObj.u_FogColor){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_FogColor失败！"); 
	}
	
	programObj.u_FogDist = gl.getUniformLocation(programObj, "u_FogDist");
	if(!programObj.u_FogDist){ // getUniformLocation获取失败则返回null
		console.log("获取uniform变量u_FogDist失败！"); 
	}
}



var ground = buildGround(30.0, 0.1,40);  // 生成地面对象

//var numSpheres = 50;  // 场景中球的数目
// 用于保存球位置的数组，对每个球位置保存其x、z坐标
//var posSphere = [];  
var sphere = buildSphere(0.2, 15, 15);  // 生成球对象
var cube=buildCube();  //生成立方体对象
var torus = buildTorus(0.35, 0.15, 40, 20);  // 生成圆环对象

var textureLoaded = 0;  //已经加载完毕的纹理图
var numTextures = 40;  //纹理图总数

var lightTexObj;  //红色光源球所使用的纹理对象
var skyTexObj;    //天空球使用的纹理对象

var gunheadObj;   //手枪炮筒
var gunhandleObj; //手枪手柄
var gunbuttonObj; //手枪开枪按钮

var wall2 = buildGround(2, 0.1, 1);  //提醒
var wall3 = buildGround(2.5, 0.1, 1);//恐怖屋解密墙
var wall4 = buildGround(2.5, 0.1, 1);//恐怖屋提示墙

var obj = loadOBJ("Res\\carcass.obj");
var obj2 = loadOBJ("Res\\carcass.obj");

var objSkull = loadOBJ("Res\\12140_Skull_v3_L2.obj");
var objSpider = loadOBJ("Res\\Only_Spider_with_Animations_Export.obj");

var objRock = loadOBJ("Res\\SpiderRock02_Obj\\SpiderRock02_Obj.obj");

var objWolf = loadOBJ("Res\\13466_Canaan_Dog_v1_L3.obj");



// var obj1 = loadOBJ("elephant\\elephant.obj");
var programObj;	// obj模型绘制所使用的program
var attribIndex = new AttribIndex();  // programObj中attribute变量索引
var mtlIndex = new MTLIndex();		  // programObj中材质变量索引
var sizeGround = 30;

var door;
var wall;
var pillar;



// 初始化场景中的几何对象
function initObjs(){
	// 初始化地面顶点数据缓冲区对象(VBO)
	ground.initBuffers(); 
	//初始化地面纹理,纹理图像为RGB图像
	ground.texObj=loadTexture("Res\\ground3.jpg",gl.RGB,true);
	
	skyTexObj=loadTexture("Res\\sky.jpg",gl.RGB,true);
	//var sizeGround = 20;
	// 随机放置球的位置
	// for(var iSphere = 0; iSphere < numSpheres; iSphere++){
		// // 在 -sizeGround 和 sizeGround 间随机选择一位置
		// var x = Math.random() * sizeGround * 2 - sizeGround;
		// var z = Math.random() * sizeGround * 2 - sizeGround;
		// posSphere.push(vec2(x, z));
	// }
	
	// 初始化球顶点数据缓冲区对象(VBO)
	sphere.initBuffers();
	sphere.texObj=loadTexture("Res\\sphere.jpg",gl.RGB,true);
	
	// 初始化圆环顶点数据缓冲区对象(VBO)
	torus.initBuffers();
	torus.texObj=loadTexture("Res\\model1.jpg",gl.RGB,true);
	
	//初始化旋转球纹理
	lightTexObj=loadTexture("Res\\sun.bmp",gl.RGB,true);
	
	//初始化立方体顶点数据缓冲对象（VBO）
	cube.initBuffers();
	cube.texObj = loadTexture("Res\\wall9.bmp",gl.RGB,true);  //墙
	wall = loadTexture("Res\\wall10.png",gl.RGB,true);  //墙(小)
	
	door = loadTexture("Res\\door1.png",gl.RGB,true);  //门

	pillar = loadTexture("Res\\torus1.jpg",gl.RGB,true);  //展柱
	
	gunheadObj=loadTexture("Res\\model1.jpg",gl.RGB,true);
	gunhandleObj=loadTexture("Res\\model1.jpg",gl.RGB,true);
	gunbuttonObj=loadTexture("Res\\model1.jpg",gl.RGB,true);
	
	wall2.initBuffers();
	var wallPicture=[
					"Res\\Kongbu3.jpg",
					"Res\\sphere10.jpg",
					"Res\\sphere7.jpg",
					"Res\\sphere6.jpg",
					"Res\\sphere5.jpg",
					"Res\\sphere4.jpg",
					"Res\\sphere3.jpg",
					"Res\\sphere2.jpg",
					"Res\\sphere1.jpg",
					"Res\\sphere8.jpg",
					"Res\\sphere9.jpg"
					];
	wall2.texObj=loadMipmappingTextures(wallPicture,gl.RGB);

	//恐怖屋解密墙
	wall3.initBuffers();
	wall3.texObj=loadTexture("Res\\topic1.jpg",gl.RGB,true);
	////恐怖屋提示墙
	wall4.initBuffers();
	wall4.texObj=loadTexture("Res\\topic3.jpg",gl.RGB,true);
	
}



// 页面加载完成后会调用此函数，函数名可任意(不一定为main)
window.onload = function main(){
	// 获取页面中id为webgl的canvas元素
    var canvas = document.getElementById("webgl");
	var hud = document.getElementById("hud");
	if(!canvas){ // 获取失败？
		alert("获取canvas元素失败！"); 
		return;
	}
	if(!hud){ // 获取失败？
		alert("获取hud元素失败！"); 
		return;
	}
	ctx = hud.getContext('2d');
	// 利用辅助程序文件中的功能获取WebGL上下文
	// 成功则后面可通过gl来调用WebGL的函数
    gl = WebGLUtils.setupWebGL(canvas, {alpha:false});    
    if (!gl){ // 失败则弹出信息
		alert("获取WebGL上下文失败！"); 
		return;
	}     
	
	//雾的颜色以及雾的起始和终止点的距离
	var fogColor = new Float32Array([0.8, 0.8, 0.8]);
	var fogDist = new Float32Array([0, 30]);
	
	/*设置WebGL相关属性*/
    gl.clearColor(0.0, 0.0, 0.5, 1.0); // 设置背景色为蓝色
	gl.enable(gl.DEPTH_TEST);	// 开启深度检测
	gl.enable(gl.CULL_FACE);	// 开启面剔除
	// 设置视口，占满整个canvas
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	gl.enable(gl.BLEND);  //开启混合
	//设置混合方式
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
	
	/*加载shader程序并为shader中attribute变量提供数据*/
	// 加载id分别为"vertex-shader"和"fragment-shader"的shader程序，
	// 并进行编译和链接，返回shader程序对象program
    program = initShaders(gl, "vertex-shader", "fragment-shader");

	// 编译链接新的shader程序对象，使用的顶点shader和上面一样，
	// 但片元shader不同	
	programObj = initShaders(gl,"vertex-shader","fragment-shaderNew");
	
    gl.useProgram(program);	// 启用该shader程序对象 
	
	// 获取shader中变量位置
	getLocation();	
	
	var  matProj;
	// 设置投影矩阵：透视投影，根据视口宽高比指定视域体
	matProj = perspective(35.0, 		// 垂直方向视角
		canvas.width / canvas.height, 	// 视域体宽高比
		0.1, 							// 相机到近裁剪面距离
		100.0);							// 相机到远裁剪面距离
		
	// 传投影矩阵	
	gl.uniformMatrix4fv(program.u_Projection,false,flatten(matProj));

	//本程序只用了0号纹理单元，更新纹理对象
	gl.uniform1i(program.u_Sampler,0);
	gl.uniform3fv(program.u_FogColor,fogColor);  //更新雾的颜色
	gl.uniform2fv(program.u_FogDist,fogDist);    //更新雾的起点和终点
	
	gl.useProgram(programObj); // 启用新的program
	
	gl.uniform3fv(programObj.u_FogColor,fogColor);  //雾的颜色
	gl.uniform2fv(programObj.u_FogDist,fogDist);    //雾的起点和终点
	
	// 传同样的投影矩阵	
	gl.uniformMatrix4fv(programObj.u_Projection,false,flatten(matProj));
		
	// 初始化场景中的几何对象
	initObjs();
	
	// 初始化光源
	initLights();
	
	//多级处理，设置纹理参数的采样方式
	gl.bindTexture(gl.TEXTURE_2D, wall2.texObj.texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
					gl.NEAREST_MIPMAP_NEAREST);

	// 进行绘制
    render();
};




// 按键响应
window.onkeydown = function(){
	switch(event.keyCode){
		case 38:	// Up
			matReverse = mult(matReverse, translate(0.0, 0.0, -0.1));
			matCamera = mult(translate(0.0, 0.0, 0.1), matCamera);
			break;
		case 40:	// Down
			matReverse = mult(matReverse, translate(0.0, 0.0, -0.1));
			matCamera = mult(translate(0.0, 0.0, -0.1), matCamera);
			break;
		case 37:	// Left
			matReverse = mult(matReverse, rotateY(1));
			matCamera = mult(rotateY(-1), matCamera);
			break;
		case 39:	// Right
			matReverse = mult(matReverse, rotateY(-1));
			matCamera = mult(rotateY(1), matCamera);
			break;
		case 87:	// W
			keyDown[0] = true;
			break;
		case 83:	// S
			keyDown[1] = true;
			break;
		case 65:	// A
			keyDown[2] = true;
			break;
		case 68:	// D
			keyDown[3] = true;
			break;
		case 32: 	// space
			if(!jumping){
				jumping = true;
				jumpTime = 0;
			}
			break;
		case 69:  //E
			lights[0].on = !lights[0].on;
			passLightsOn();
			break;
		case 80:  //P
			lights[1].on = false;
			passLightsOn();
			break;
		case 84:  //T
			lights[2].on = !lights[2].on;
			passLightsOn();
			break;
		case 48://0
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 0;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 0;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 0;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 0;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 0;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 0;
					break;
				}
			}
			break;
		case 49://1
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 1;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 1;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 1;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 1;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 1;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 1;
					break;
				}
			}
			break;
		case 50://2
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 2;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 2;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 2;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 2;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 2;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 2;
					break;
				}
			}
			break;
		case 51://3
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 3;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 3;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 3;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 3;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 3;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 3;
					break;
				}
			}
			break;
		case 52://4
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 4;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 4;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 4;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 4;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 4;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 4;
					break;
				}
			}
			break;
		case 53://5
			if(isTypingPassword)
			{
				if(decrypt[0] === -1)
				{
					decrypt[0] = 5;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 5;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 5;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 5;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 5;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 5;
					break;
				}
			}
			break;
		case 54://6
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 6;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 6;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 6;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 6;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 6;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 6;
					break;
				}
			}
			break;
		case 55://7
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 7;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 7;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 7;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 7;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 7;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 7;
					break;
				}
			}
			break;
		case 56://8
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 8;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 8;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 8;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 8;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 8;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 8;
					break;
				}
			}
			break;
		case 57://9
			if(isTypingPassword)
			{
				if(decrypt[0] == -1)
				{
					decrypt[0] = 9;
					break;
				}
				if(decrypt[1] == -1)
				{
					decrypt[1] = 9;
					break;
				}
				if(decrypt[2] == -1)
				{
					decrypt[2] = 9;
					break;
				}
				if(decrypt[3] == -1)
				{
					decrypt[3] = 9;
					break;
				}
				if(decrypt[4] == -1)
				{
					decrypt[4] = 9;
					break;
				}
				if(decrypt[5] == -1)
				{
					decrypt[5] = 9;
					break;
				}
			}
			break;

	}
	// 禁止默认处理(例如上下方向键对滚动条的控制)
	event.preventDefault(); 
	//console.log("%f, %f, %f", matReverse[3], matReverse[7], matReverse[11]);
}

// 按键弹起响应
window.onkeyup = function(){
	switch(event.keyCode){
		case 87:	// W
			keyDown[0] = false;
			break;
		case 83:	// S
			keyDown[1] = false;
			break;
		case 65:	// A
			keyDown[2] = false;
			break;
		case 68:	// D
			keyDown[3] = false;
			break;
	}
}



//鼠标按下事件
window.onmousedown = function(){
	// 鼠标点击位置
    var x = event.clientX;
    var y = event.clientY;

    lastX = x;
    lastY = y;

    dragging = true;
	keyDown[4] = true;
};



//鼠标抬起事件
window.onmouseup = function(){
    dragging = false;
	keyDown[4] = false;
};



window.onmousemove = function(){
    var x = event.clientX, y = event.clientY;

    if (dragging) {

		var factor = 0.05;
		dx = factor * (x - lastX);
		dy = factor * (y - lastY);
    }

    lastX = x, lastY = y;
};
	
	
	
// 记录上一次调用函数的时刻
var last = Date.now();
//记录密码输入等待时间
var PassWordtime=0;


// 根据时间更新旋转角度
function animation(){
	// 计算距离上次调用经过多长的时间
	var now = Date.now();
	var elapsed = (now - last) / 1000.0; // 秒
	last = now;
	
	// 更新动画状态
	yRot += deltaAngle * elapsed;

	// 防止溢出
    yRot %= 360;
	
	// 跳跃处理
	jumpTime += elapsed;
	if(jumping){
		jumpY = initSpeed * jumpTime - 0.5 * g * jumpTime * jumpTime;
		if(jumpY <= 0){
			jumpY = 0;
			jumping = false;
		}
	}
	//当密码以及写满并且密码不正确的时候，记录输入的时间
	if(isPasswordFull && !isPassowrdRight)
	{
		if(PassWordtime < 1)//时间增加
			PassWordtime += elapsed;
		if(PassWordtime >= 1)//时间>1s,数组清除
		{
			decrypt[0] = -1;
			decrypt[1] = -1;
			decrypt[2] = -1;
			decrypt[3] = -1;
			decrypt[4] = -1;
			decrypt[5] = -1;
			isPasswordFull = false;
		}
	}
	//输入正确记录已经等待的时间
	else if(isPasswordFull && isPassowrdRight)
	{
		if(PassWordtime < 2)
			PassWordtime += elapsed;
	}
	//其他情况等待时间为0
	else
	{
		PassWordtime = 0;
	}
}



// 更新照相机变换
function updateCamera(){
	matReverse = mult(matReverse, rotateX(currentAngleX));
	matCamera = mult(rotateX(-currentAngleX), matCamera);
	matReverse = mult(matReverse, rotateY(-dx));
	matCamera = mult(rotateY(dx), matCamera);
	// 照相机前进
	if(keyDown[0]){

		matReverse = mult(matReverse, translate(0.0, 0.0, -0.04));
		matCamera = mult(translate(0.0, 0.0, 0.04), matCamera);
	}

	// 照相机后退
	if(keyDown[1]){

		matReverse = mult(matReverse, translate(0.0, 0.0, 0.04));
		matCamera = mult(translate(0.0, 0.0, -0.04), matCamera);
	}

	// 照相机左转
	if(keyDown[2]){

		matReverse = mult(matReverse, rotateY(0.5));
		matCamera = mult(rotateY(-0.5), matCamera);
	}

	// 照相机右转
	if(keyDown[3]){

		matReverse = mult(matReverse, rotateY(-0.5));
		matCamera = mult(rotateY(0.5), matCamera);
	}


	collide();
	currentAngleX += dy;
	if(currentAngleX > 60.0)
		currentAngleX = 60.0;
	else if(currentAngleX < -60.0)
		currentAngleX = -60.0;
	matReverse = mult(matReverse, rotateX(-currentAngleX));
	matCamera = mult(rotateX(currentAngleX), matCamera);
	
	dx = 0.0;
	dy = 0.0;
	var cameraPosition = vec4(0.0, 0.0, 0.0, 1.0);      // 设置初始位置为原点
	cameraPosition = mult(matReverse, cameraPosition);  // 应用摄像头的变换矩阵

	// 显示摄像头位置信息
	document.getElementById("cameraPositionElement").innerHTML = "Camera Position: (" + cameraPosition[0] + ", "  + cameraPosition[2] + ")";
	//document.getElementById("cameraPositionElement").innerHTML = "1,2,3";
}



//倒计时实现
// 获取元素
const minutesElem = document.getElementById('minutes');
const secondsElem = document.getElementById('seconds');

// 设置截止时间(30分钟)
const countDownTime = 10 * 60 * 1000;
let remainingTime = countDownTime;

// 每秒更新倒计时
const x = setInterval(function() {
	// 计算剩余时间的分钟和秒
	const minutes = Math.floor(remainingTime / (1000 * 60));
	const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

	// 输出倒计时
	minutesElem.innerHTML = minutes < 10 ? '0' + minutes : minutes;
	secondsElem.innerHTML = seconds < 10 ? '0' + seconds : seconds;

	// 如果倒计时结束，清除计时器
	if (remainingTime <= 0) {
		clearInterval(x);
		minutesElem.innerHTML = '00';
		secondsElem.innerHTML = '00';
		countdown.innerHTML = "倒计时已结束";
		gameOver = true;
	}

	// 减少剩余时间
	remainingTime -= 1000;
}, 1000);



function updateModelPosition() {
	const speed = 0.05; // 移动速度
	// 更新模型位置
	modelPosition.x += speed * direction;
	// 判断是否达到边界并改变移动方向
	if (modelPosition.x >= 12) {
		modelPosition.x = 12;
		direction = -1;
	} else if (modelPosition.x <= -12) {
		modelPosition.x = -12;
		direction = 1;
	}
	modelPosition.z = -17;//微调位置

	return modelPosition;
}



// function updateModelPosition2() {
// 	const speed = 0.05; // 移动速度
// 	// 更新模型位置
// 	modelPosition2.z += speed * direction;
// 	// 判断是否达到边界并改变移动方向
// 	if (modelPosition2.z >= 3) {
// 		modelPosition2.z = 3;
// 		direction = -1;
// 	} else if (modelPosition2.z<= -3) {
// 		modelPosition2.z = -3;
// 		direction = 1;
// 	}
//
//
// 	return modelPosition2;
// }
function updateModelPosition2() {
	const speed = 0.05; // 移动速度
	const lowerBound = -28;
	const upperBound = -3;

	// 更新模型位置
	modelPosition2.z += speed * direction;

	// 判断是否到达上下边界并改变移动方向
	if (modelPosition2.z >= upperBound) {
		modelPosition2.z = upperBound;
		direction = -1; // 移动方向向负方向改变
	} else if (modelPosition2.z <= lowerBound) {
		modelPosition2.z = lowerBound;
		direction = 1; // 移动方向向正方向改变
	}

	return modelPosition2;
}



// 绘制函数
function render() {

	var x = matReverse[3];
	var z = matReverse[11];

	//检查是否一切就绪
	if(!obj.isAllReady(gl))
	{
		requestAnimFrame(render);  // 请求重绘
		return;	 // 返回
	}
	if(!obj2.isAllReady(gl))
	{
		requestAnimFrame(render);  // 请求重绘
		return;	 // 返回
	}
	// if(!obj1.isAllReady(gl))
	// {
		// requestAnimFrame(render);
		// return;
	// }
	if(!objSkull.isAllReady(gl)) {
		requestAnimFrame(render);  // 请求重绘
		return;	 // 返回
	}
	if(!objSpider.isAllReady(gl)) {
		requestAnimFrame(render);  // 请求重绘
		return;	 // 返回
	}
	if(!objRock.isAllReady(gl)) {
		requestAnimFrame(render);  // 请求重绘
		return;	 // 返回
	}
	if(!objWolf.isAllReady(gl)) {
		requestAnimFrame(render);  // 请求重绘
		return;	 // 返回
	}





	animation();  // 更新动画参数
	
	updateCamera();  // 更新相机变换
	
	// 清颜色缓存和深度缓存
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   
    // 模视投影矩阵初始化为投影矩阵*照相机变换矩阵
	matMV = mult(translate(0, -jumpY, 0), matCamera);

	draw2D();
	//为光源位置数组传值
	var lightPositions = [];
	//决定旋转球位置的变换
	var matRotatingSphere = mult(matMV, mult(translate(0.0,0.0,-2.5), mult(rotateY(0), translate(1.0,0.0,0.0))));
	lightPositions.push(mult(matMV, lightSun.pos));
	lightPositions.push(mult(matRotatingSphere, lightRed.pos));
	lightPositions.push(lightYellow.pos);
	
	//传观察坐标系下的光源位置/方向
	gl.useProgram(program);
	gl.uniform4fv(program.u_LightPosition, flatten(lightPositions));
	gl.useProgram(programObj);
	gl.uniform4fv(programObj.u_LightPosition, flatten(lightPositions));
	
	//怪兽
	var modelPosition = updateModelPosition();  //怪兽的模型移动
	ModelCollide(modelPosition);  //怪兽的碰撞检测
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV, translate(modelPosition.x, modelPosition.y, modelPosition.z));
	//matMV = mult(matMV, rotateY(-yRot * 3.0));
	matMV = mult(matMV, scale(0.4, 0.4, 0.4));
	gl.uniformMatrix4fv(programObj.u_ModelView,
						false,
						flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,
						false,
						flatten(normalMatrix(matMV)));
	obj.draw(gl,attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();

	//怪兽2
	// var modelPosition2 = updateModelPosition2();  //怪兽的模型移动
	// ModelCollide(modelPosition2);  //怪兽的碰撞检测
	// gl.useProgram(programObj);
	// mvStack.push(matMV);
	// matMV = mult(matMV, translate(modelPosition2.x, modelPosition2.y, modelPosition2.z));
	//
	// //matMV = mult(matMV, rotateY(-yRot * 3.0));
	// matMV = mult(matMV, scale(0.4, 0.4, 0.4));
	// gl.uniformMatrix4fv(programObj.u_ModelView,
	// 	false,
	// 	flatten(matMV));
	// gl.uniformMatrix3fv(programObj.u_NormalMat,
	// 	false,
	// 	flatten(normalMatrix(matMV)));
	// obj2.draw(gl,attribIndex, mtlIndex, programObj.u_Sampler);
	// matMV = mvStack.pop();
	
	// gl.useProgram(programObj);
	// mvStack.push(matMV);
	// matMV=mult(matMV,translate(0.6,-0.3,-2.5));
	// matMV=mult(matMV,rotateY(180));
	// matMV=mult(matMV,scale(0.003,0.003,0.003));
	// gl.uniformMatrix4fv(programObj.u_ModelView,
						// false,
						// flatten(matMV));
	// gl.uniformMatrix3fv(programObj.u_NormalMat,
						// false,
						// flatten(normalMatrix(matMV)));
	// obj1.draw(gl,attribIndex,mtlIndex,programObj.u_Sampler);
	// matMV=mvStack.pop();

	//骷髅
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV, translate(5,0.3,2.5));
	//matMV = mult(matMV, rotateY(-yRot * 3.0));
	matMV = mult(matMV, rotX);       // 绕X轴旋转90度
	matMV = mult(matMV, scale(0.01, 0.01, 0.01));
	gl.uniformMatrix4fv(programObj.u_ModelView,
		false,
		flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,
		false,
		flatten(normalMatrix(matMV)));
	objSkull.draw(gl,attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();

	//蜘蛛
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV, translate(5,0.3,6.5));
	//matMV = mult(matMV, rotateY(-yRot * 3.0));
	matMV = mult(matMV, scale(0.002, 0.002, 0.002));
	gl.uniformMatrix4fv(programObj.u_ModelView,
		false,
		flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,
		false,
		flatten(normalMatrix(matMV)));
	objSpider.draw(gl,attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();

	//化石
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-5,0.4,6.5));
	//matMV = mult(matMV, rotateY(-yRot * 3.0));

	matMV = mult(matMV, scale(0.005, 0.006, 0.006));
	gl.uniformMatrix4fv(programObj.u_ModelView,
		false,
		flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,
		false,
		flatten(normalMatrix(matMV)));
	objRock.draw(gl,attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();

	//狼
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-5,0.3,2.5));
	//matMV = mult(matMV, rotateY(-yRot * 3.0));
	matMV = mult(matMV, rotX);       // 绕X轴旋转90度
	matMV = mult(matMV, scale(0.01, 0.01, 0.01));
	gl.uniformMatrix4fv(programObj.u_ModelView,
		false,
		flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,
		false,
		flatten(normalMatrix(matMV)));
	objWolf.draw(gl,attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();
	
	
	gl.useProgram(program);  //后面这些对象使用的都是这个program
	//绘制天空球
	gl.disable(gl.CULL_FACE);  //关闭背面剔除
	mvStack.push(matMV);  //不让对天空的变换影响到后面的对象
	matMV = mult(matMV, scale(220.0, 220.0, 220.0));  //放大到足够大
	matMV = mult(matMV, rotateX(90));  //调整南北极
	gl.uniform1i(program.u_bOnlyTexture, 1);  //让u_bOnlyTexture为真
	//绘制天空球，材质无所谓，因为关闭了光照计算
	//使用天空球的纹理
	sphere.draw(matMV, null, skyTexObj);
	gl.uniform1i(program.u_bOnlyTexture, 0);  //让u_bOnlyTexture为假
	matMV = mvStack.pop();
	gl.enable(gl.CULL_FACE);  //重新开启背面剔除


	/*绘制地面*/
	mvStack.push(matMV);
	// 将地面移到y=-0.4平面上
	matMV = mult(matMV, translate(0.0, -0.4, 0.0));
	ground.draw(matMV);
	matMV = mvStack.pop();
	
	//绘制墙
	// mvStack.push(matMV);
	// matMV = mult(matMV,translate(0.0,0.0,0.5));
	// matMV = mult(matMV, rotateX(90));	// 立起来
	// wall2.draw(matMV);
	// matMV = mvStack.pop();


	drawDecryptwall();
	// 将后面的模型往-z轴方向移动
	// 使得它们位于摄像机前方(也即世界坐标系原点前方)
	matMV = mult(matMV, translate(0.0, 0.0, -2.5));





	drawGun();

	if (gameOver === true){
		window.alert("游戏失败，请刷新页面重新开始游戏");
	}
	
	requestAnimFrame(render); // 请求重绘
}



function draw2D()
{
	//获取相机当前x，z轴的值
	var x = matReverse[3];
	var z = matReverse[11];

//未输入正确密码或者密码正确记录的时间<1s并且输入满了
	if(!isPassowrdRight || (isPassowrdRight && nowTime < 1 && isPasswordFull))
	{
		if(x > -13 && x < -9&&z> -24.8 && z < -23)//碰撞检测
		{
			isTypingPassword = true;

			ctx.clearRect(0,0,800,600);
			ctx.font = '30px "黑体"';
			ctx.fillStyle = 'rgba(255,255,255,1)';
			ctx.fillText('密码是：',200,200);
			if(decrypt[0] != -1)
				ctx.fillText(decrypt[0],360,200);
			if(decrypt[1] != -1)
				ctx.fillText(decrypt[1],380,200);
			if(decrypt[2] != -1)
				ctx.fillText(decrypt[2],400,200);
			if(decrypt[3] != -1)
				ctx.fillText(decrypt[3],420,200);
			if(decrypt[4] != -1)
				ctx.fillText(decrypt[4],440,200);
			if(decrypt[5] != -1)
				ctx.fillText(decrypt[5],460,200);
			ctx.fillText('——',355,215);
			ctx.fillText('——',385,215);
			ctx.fillText('——',415,215);
			ctx.fillText('——',445,215);

			if(decrypt[5] != -1)
			{
				//密码正确输入时间>1秒
				if(decrypt[0] == 3 && decrypt[1] == 0 && decrypt[2] == 7&& decrypt[3] == 0 && decrypt[4] == 6&& decrypt[5] == 0)
				{

					ctx.clearRect(0,0,800,600);
					ctx.font = '30px "黑体"';
					ctx.fillStyle = 'rgba(255,255,255,1)';
					ctx.fillText('密码正确！',320,220);
					ctx.font = '40px "黑体"';
					ctx.fillText('恭喜你逃离诡异博物馆！',350,300);
					isPasswordFull = true;
					isPassowrdRight = true;
					isTypingPassword = false;
				}
				else
				{
					ctx.clearRect(0,0,800,600);
					ctx.font = '30px "黑体"';
					ctx.fillStyle = 'rgba(255,255,255,1)';
					ctx.fillText('密码错误！',400,200);
					isPasswordFull = true;
					isPassowrdRight = false;
				}
			}
		}
		else{
			isTypingPassword = false;
			ctx.clearRect(0,0,800,600);
		}
	}
	
	
	//中间展区
	var table3XMin = 0;
	var table3XMax = 0.5;
	var table3ZMin = 4;
	var table3ZMax = 5;
	if (x >= table3XMin - 0.5 && x <= table3XMax + 0.5 && z >= table3ZMin - 0.5 && z <= table3ZMax + 0.5) {
		ctx.clearRect(0,0,800,600);
		ctx.font = '23px "黑体"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('Hi！我的名字叫简略小枪。我这有一道谜题，解出谜题方可获得钥匙坐标。',30,200);
		//拿到钥匙后便可进入下一个房间继续冒险哦！
		ctx.fillText('拿到钥匙后便可进入下一个房间继续探索哦！',30,230);
		//谜题1：我和弟弟今年的年龄和是21岁，5年后我比弟弟大3岁，问我和弟弟今年各几岁？(注：姐姐年龄为x坐标，弟弟年龄为z坐标)
		ctx.fillText('谜题1：我和弟弟今年的年龄和是21岁，5年后我比弟弟大3岁，',30,260);
		ctx.fillText('请问我和弟弟今年各几岁？(注：姐姐年龄为x坐标，弟弟年龄为z坐标)',30,290);
	}
	
		
	
	//右上方展区
	var tableXMin = 4.5;
	var tableXMax = 5;
	var tableZMin = 2;
	var tableZMax = 2.5;

	if (x >= tableXMin-0.5 && x <= tableXMax+0.5 && z >= tableZMin-0.5&& z <= tableZMax+0.5) {
		ctx.clearRect(0,0,800,600);
		ctx.font = '23px "黑体"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('Hi！我是山顶洞人头颅化石，他们都叫我萨斯吉。',50,200);
		ctx.fillText('我这有一道谜题，解开谜题并记住答案可能对你后面的探索有所帮助哦！',50,230);
		ctx.fillText('谜题2：用0、1、2、3四个数字能组成多少个不同的三位数？',50,260);
	}
	
	
	//右下方展区
	var table2XMin = 4.5;
	var table2XMax = 5.5;
	var table2ZMin = 6;
	var table2ZMax = 7;

	if (x >= table2XMin-0.5 && x <= table2XMax+0.5 && z >= table2ZMin-0.5 && z <= table2ZMax+0.5)
	{
		ctx.clearRect(0,0,800,600);
		ctx.font = '23px "黑体"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('Hi！我是一只变异蜘蛛制作的标本，他们都叫我小蛛蛛。',50,200);
		ctx.fillText('我这有一道谜题，解开谜题并记住答案可能对你后面的探索有所帮助哦！',50,230);
		ctx.fillText('谜题3：123-(68+23)的结果是多少？',50,260);
	}
	
	
	
	//左上方展区
	var table5XMin = -5;
	var table5XMax = -4.5;
	var table5ZMin = 2.5;
	var table5ZMax = 3;

	if (x >= table5XMin-0.5&& x <= table5XMax+0.5 && z >= table5ZMin-0.5&& z <= table5ZMax+0.5) {
		ctx.clearRect(0,0,800,600);
		ctx.font = '23px "黑体"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('Hi！我是一只忠诚的中华田园犬，我的名字叫撒库拉酱。',50,200);
		ctx.fillText('我这有一道谜题，解开谜题并记住答案可能对你后面的探索有所帮助哦！',50,230);
		ctx.fillText('谜题4：某班共有学生40名，其中女生占45％，请问男生有几人？',50,260);
	}
	
	

	//左下方展区
	var table4XMin = -5.5;
	var table4XMax = -4.5;
	var table4ZMin = 6;
	var table4ZMax = 7;

	if (x >= table4XMin-0.5 && x <= table4XMax+0.5 && z >= table4ZMin-0.5&& z <= table4ZMax+0.5) {
		ctx.clearRect(0,0,800,600);
		ctx.font = '23px "黑体"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('Hi！我是一块远古化石，他们都叫我老石子。',50,200);
		ctx.fillText('我这有一道谜题，解开谜题并记住答案可能对你后面的探索有所帮助哦！',50,230);
		ctx.fillText('谜题5：蚂蚁爬树枝，每上一节需要10s，请问蚂蚁从第1节',50,260);
		ctx.fillText('爬到第7节需要多少秒？',50,290);
	}
}



//绘制第二房间的提示解密墙
function drawDecryptwall()
{
	//绘制
	mvStack.push(matMV);
	matMV=mult(matMV,translate(11,0.0,-10));
	matMV = mult(matMV, rotateX(90));
	wall2.draw(matMV);
	matMV = mvStack.pop();

	//绘制解密墙
	mvStack.push(matMV);
	matMV=mult(matMV,translate(-2,0.0,-6));
	matMV = mult(matMV, rotateX(90));
	matMV=mult(matMV,rotateZ(-90));
	wall3.draw(matMV);
	matMV = mvStack.pop();

	//绘制提示墙
	mvStack.push(matMV);
	matMV=mult(matMV,translate(3,0.0,-20));
	matMV = mult(matMV, rotateX(90));
	matMV=mult(matMV,rotateZ(-45));
	wall4.draw(matMV);
	matMV = mvStack.pop();

}



function drawGun()
{
	//头
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0, 0.46, 7));
	matMV=mult(matMV, scale(1.2, 0.4, 0.4));
	cube.draw(matMV, null, gunheadObj);
	matMV = mvStack.pop();
	
	//柄
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0.106, 0.4, 7));
	matMV = mult(matMV, scale(0.1, 0.5, 0.3));
	cube.draw(matMV, null, gunhandleObj);
	matMV = mvStack.pop();
	
	//卡扣
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0.08, 0.4, 7));
	matMV = mult(matMV,scale(0.07,0.07,0.07));
	torus.draw(matMV);
	matMV = mvStack.pop();
	
	//弹头
	mvStack.push(matMV);
	matMV = mult(matMV, rotateY(90));
	matMV = mult(matMV, translate(-7, 0.46, -0.125));
	matMV = mult(matMV, scale(0.065, 0.065, 0.065));
	torus.draw(matMV);
	matMV=mvStack.pop();
	
	
	// mvStack.push(matMV);
	// matMV=mult(matMV,translate(1.0,9,5.5));
	// matMV=mult(matMV,scale(100,,10));
	// cube.draw(matMV,null,gunbuttonObj);
	// matMV=mvStack.pop();
	
	//绘制后墙
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0, 2.5, -23));
	matMV = mult(matMV, scale(130, 30, 0.4));
	cube.draw(matMV);
	matMV = mvStack.pop();


	//绘制前墙
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0, 2.5, 13));
	matMV = mult(matMV, scale(130, 30, 0.4));
	cube.draw(matMV);
	matMV = mvStack.pop();


	//绘制中墙
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-1, 2.5, 0));
	matMV = mult(matMV, scale(120, 30, 0.4));
	cube.draw(matMV);
	matMV = mvStack.pop();
	
	//绘制中墙(小)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(12, 4.5, 0));
	matMV = mult(matMV, scale(10, 12, 0.4));
	cube.draw(matMV, null, wall);
	// cube.draw(matMV);
	matMV = mvStack.pop();
	
	if(doorOpen === false){
		//绘制门(中间)
		mvStack.push(matMV);
		matMV = mult(matMV, translate(12, 1.4, 0));
		matMV = mult(matMV, scale(10, 19, 0.4));
		cube.draw(matMV, null, door);
		matMV = mvStack.pop();
	}
	else{
		//绘制门(中间)
		mvStack.push(matMV);
		matMV = mult(matMV, translate(11, 1.4, 1));
		//旋转
		matMV = mult(matMV, rotY);
		matMV = mult(matMV, scale(10, 19, 0.4));
		cube.draw(matMV, null, door);
		matMV = mvStack.pop();
	}


	//绘制左墙
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-13, 2.5, -4));
	matMV = mult(matMV, scale(0.4, 30, 170));
	cube.draw(matMV);
	matMV = mvStack.pop();
	
	
	//绘制左墙(小)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-13, 4.5, -22));
	matMV = mult(matMV, scale(0.4, 12, 10));
	cube.draw(matMV, null, wall);
	// cube.draw(matMV);
	matMV = mvStack.pop();
	
	
	//绘制门(左边)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-13, 1.4, -22));
	matMV = mult(matMV, scale(0.4, 19, 10));
	cube.draw(matMV, null, door);
	matMV = mvStack.pop();
	
	
	
	//绘制右墙
	mvStack.push(matMV);
	matMV = mult(matMV, translate(13, 2.5, -5));
	matMV = mult(matMV, scale(0.4, 30, 180));
	cube.draw(matMV);
	matMV = mvStack.pop();
	
	//绘制屋顶(平面)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0, 5.5, -5));
	matMV = mult(matMV, scale(150, 0.4, 200));
	cube.draw(matMV);
	matMV = mvStack.pop();
	
	
	//绘制屋顶(左边)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-7.2, 7.8, -5));
	matMV = mult(matMV, rotateZ(16.5));
	matMV = mult(matMV, scale(75,0.4,180));
	cube.draw(matMV);
	matMV = mvStack.pop();
	
	//绘制屋顶(右边)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(7.2, 7.8, -5));
	matMV = mult(matMV, rotateZ(-16.5));
	matMV = mult(matMV, scale(75, 0.4, 180));
	cube.draw(matMV);
	matMV = mvStack.pop();

	//绘制展柱(右上)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(5, -0.2, 5));
	matMV = mult(matMV, scale(2, 5, 2));
	cube.draw(matMV, null, pillar);
	matMV = mvStack.pop();

	//绘制展柱(右下)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(5, -0.2, 9));
	matMV = mult(matMV, scale(2, 5, 2));
	cube.draw(matMV, null, pillar);
	matMV = mvStack.pop();

	//绘制展柱(中下)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0, -0.2, 7));
	matMV = mult(matMV, scale(2, 5, 2));
	cube.draw(matMV, null, pillar);
	matMV = mvStack.pop();

	//绘制展柱(左上)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-5, -0.2, 5));
	matMV = mult(matMV, scale(2, 5, 2));
	cube.draw(matMV, null, pillar);
	matMV = mvStack.pop();

	//绘制展柱(左下)
	mvStack.push(matMV);
	matMV = mult(matMV, translate(-5, -0.2, 9));
	matMV = mult(matMV, scale(2, 5, 2));
	cube.draw(matMV, null, pillar);
	matMV = mvStack.pop();
}



function collide()
{
	var x = matReverse[3];
	var z = matReverse[11];

	var isWallCollision = false; // 是否发生碰撞
	var isKeyCollision = false;

	// 方块的位置
	var cubeX = 12.0;
	var cubeZ = 9.0;
	var cubeSize = 1; // 方块的大小

	// 与钥匙
	if (
		x >= cubeX - cubeSize / 2 &&
		x <= cubeX + cubeSize / 2 &&
		z >= cubeZ - cubeSize / 2 &&
		z <= cubeZ + cubeSize / 2
	) {
		isKeyCollision = true;
	}
	if (!HaveKey){
		if (isKeyCollision){
			document.getElementById("text_Key").innerHTML = "拿到了钥匙";
			HaveKey = true;
		}
	}

	// 墙体的范围
	var wallXMin = 12.4;
	var wallXMax = 13.4;
	var wallZMin = -26;
	var wallZMax = 10.5;

	// 检测与墙体的碰撞
	if (x >= wallXMin && x <= wallXMax && z >= wallZMin && z <= wallZMax) {
		isWallCollision = true;
	}

	//右上方
	var tableXMin = 4.5;
	var tableXMax = 5;
	var tableZMin = 2;
	var tableZMax = 2.5;

	// 检测与墙体的碰撞
	if (x >= tableXMin && x <= tableXMax && z >= tableZMin && z <= tableZMax) {
		//document.getElementById("text_collide2").innerHTML = "你碰到了展品";
		isWallCollision = true;
	}

	//右下方
	var table2XMin = 4.5;
	var table2XMax = 5.5;
	var table2ZMin = 6;
	var table2ZMax = 7;

	// 检测与墙体的碰撞
	if (x >= table2XMin && x <= table2XMax && z >= table2ZMin && z <= table2ZMax) {
		//document.getElementById("text_collide2").innerHTML = "你碰到了展品";
		isWallCollision = true;
	}

	//中间
	var table3XMin = 0;
	var table3XMax = 0.5;
	var table3ZMin = 4;
	var table3ZMax = 5;

	// 检测与墙体的碰撞
	if (x >= table3XMin && x <= table3XMax && z >= table3ZMin && z <= table3ZMax) {
		//document.getElementById("text_collide2").innerHTML = "111";
		isWallCollision = true;
	}
	
	//左上方
	var table5XMin = -5;
	var table5XMax = -4.5;
	var table5ZMin = 2.5;
	var table5ZMax = 3;

	// 检测与墙体的碰撞
	if (x >= table5XMin && x <= table5XMax && z >= table5ZMin && z <= table5ZMax) {
		//document.getElementById("text_collide2").innerHTML = "你碰到了展品";
		isWallCollision = true;
	}

	//左下方
	var table4XMin = -5.5;
	var table4XMax = -4.5;
	var table4ZMin = 6;
	var table4ZMax = 7;

	// 检测与墙体的碰撞
	if (x >= table4XMin && x <= table4XMax && z >= table4ZMin && z <= table4ZMax) {
		//document.getElementById("text_collide2").innerHTML = "你碰到了展品";
		isWallCollision = true;
	}

	var door3XMin = -13.08;
	var door3XMax = 12.3;
	var door3ZMin = 10;
	var door3ZMax = 10.6;
	if (x >= door3XMin && x <= door3XMax && z >= door3ZMin && z <= door3ZMax) {
		isWallCollision = true;
	}

	var door4XMin = -13.9;
	var door4XMax = -12.5;
	var door4ZMin = -23;
	var door4ZMax = 10.5;
	if (x >= door4XMin && x <= door4XMax && z >= door4ZMin && z <= door4ZMax) {
		isWallCollision = true;
	}

	var door5XMin = -12.1;
	var door5XMax = 12.9;
	var door5ZMin = -26;
	var door5ZMax = -25;
	if (x >= door5XMin && x <= door5XMax && z >= door5ZMin && z <= door5ZMax) {
		isWallCollision = true;
	}

	var door6XMin = -12.28;
	var door6XMax = 9.98;
	var door6ZMin = -3;
	var door6ZMax = -2;
	if (x >= door6XMin && x <= door6XMax && z >= door6ZMin && z <= door6ZMax) {
		isWallCollision = true;
	}

	if(x<-sizeGround||x>sizeGround||z<-sizeGround||z>sizeGround)//边界
	{
		isWallCollision = true;
	}

	var doorXMin = 10;
	var doorXMax = 12.4;
	var doorZMin = -3.6;
	var doorZMax = -2.2;

	var door2XMin = 11.4;
	var door2XMax = 10.9;
	var door2ZMin = -3.6;
	var door2ZMax = 0.08;
	
	// 检测与墙体的碰撞
	if (x >= doorXMin && x <= doorXMax && z >= doorZMin && z <= doorZMax) {
		if (HaveKey){
			doorOpen = true;
		}else {
			isWallCollision = true;
		}
	}

	if (doorOpen || HaveKey){
		if (x >= door2XMin && x <= door2XMax && z >= door2ZMin && z <= door2ZMax) {
			isWallCollision = true;
		}
	}

	if(x >=-13 && x <=-11.5&&z >=-24.8 && z <=-23) {
		if (!isPassowrdRight) {
			isWallCollision = true;
		}
	}

	if(isWallCollision === true){
		if(keyDown[1])
		{
			matReverse=mult(matReverse,translate(0.0,0.0,-0.3));
			matCamera=mult(translate(0.0,0.0,0.3),matCamera);
		}
		if(keyDown[0])
		{
			matReverse=mult(matReverse,translate(0.0,0.0,0.3));
			matCamera=mult(translate(0.0,0.0,-0.3),matCamera);
		}
	}
}



function ModelCollide(Position) {
	var x = matReverse[3];
	var z = matReverse[11];

	var catX = Position.x;
	var catZ = Position.z;

	if (x >= catX - 1 && x <= catX + 1 && z >= catZ - 1 && z <= catZ + 1) {
		document.getElementById("text_collide").innerHTML = "你碰到了怪兽";
		gameOver = true;
	}
	else{
		document.getElementById("text_collide").innerHTML = "";
	}
}