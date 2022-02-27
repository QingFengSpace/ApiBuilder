const express = require('express');
const cors = require('cors');//引入跨域模块，不然易导致跨域问题
const fs = require("fs");
const app = express();
app.use(cors());
app.use(express.json());//解析request.body内容json格式
app.use(express.urlencoded({ extended: false }));

/**使用deviceData.json文件进行增删改查：
 * get-根据url中的id查询http://localhost:8989/server/getById/1001, req.params.id获取参数, getById?id=3则用req.query.num
 * get-分页查询第1页每页3条http://localhost:8989/server/pagination/1/3
 * post-增加单个设备http://localhost:8989/server/add; data:JSON.stringfy({id:101, name:"王五"})
 * put-根据data中的id修改单个设备http://localhost:8989/server/update; data:JSON.stringfy({id:101, name:"张三"})
 * delete-根据url中的id删除，http://localhost:8989/server/deleteById/1001
 */

let requestCount = 0;
function requestInit(req, res) {//给请求配置跨域
    requestCount++;
    console.log(new Date().toLocaleString() + ` 第${requestCount}次发来请求,IP为${req.ip}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, OPTIONS, DELETE');
}

app.get('/getJsonObj', (request, response) => {//返回自定义Json对象用于前端快速测试
    requestInit(response);
    console.log('----------已进入测试方法-------------');
    let data = [
        {
            "alarmObject": "13层烟感",
            "alarmPosition": "医疗业务综合楼-8层",
            "alarmTime": "2021-11-16 18:00:19",
            "alarmState": "13层烟感的1号感烟触发感烟报警！",
        }, {
            "alarmObject": "19-WXBJ01",
            "alarmPosition": "医疗业务综合楼-19层 眼科病房",
            "alarmTime": "2021-10-27 12:11:50",
            "alarmState": "十九层护士站触发按键告警！",
        }
    ]
    response.send(data);
    // response.send(request.body);
})

app.post('/server/addOrUpdate', (request, response) => {
    requestInit(request, response);
    if (JSON.stringify(request.body) == "{}") {
        console.log('--前端传来空数据，操作失败--');
        response.send({ "msg": "后端收到空数据，操作失败" })
    }
    else {
        fs.readFile('./deviceData.json', function (err, data) {
            if (err) {
                console.error(err);
            }
            let device = data.toString();
            device = JSON.parse(device);
            let flag = false;
            for (let i = 0; i < device.data.length; i++) {
                if (request.body.deviceId == device.data[i].deviceId) {
                    flag = true;
                    device.data[i] = request.body;
                    break;
                }
            }
            if (flag) {//找到则修改
                device.total = device.data.length;
                let str = JSON.stringify(device);
                fs.writeFile('./deviceData.json', str, function (err) {
                    if (err) {
                        console.error(err);
                    }
                })
                console.log('----------修改成功----------');
                response.send({ "msg": "修改成功" });//返回要修改的原始数据
            }
            else {//未找到则新增
                device.data.push(request.body);//将传来的对象push进数组对象中
                device.total = device.data.length;//定义一下总条数，为以后的分页打基础
                let str = JSON.stringify(device);
                fs.writeFile('./deviceData.json', str, function (err) {
                    if (err) {
                        console.error(err);
                    }
                })
                console.log('----------新增成功-------------');
                response.send({ "msg": "新增成功" })
            }
        })
    }
})

app.get('/server/getById', (request, response) => {//根据url中的id查询，http://localhost:8989/server/getById?id=101
    requestInit(request, response);
    fs.readFile('./deviceData.json', function (err, data) {
        if (err) {
            console.error(err);
        }
        let device = data.toString();
        device = JSON.parse(device);
        //把数据读出来进行查找，找到将flag置为true
        let flag = false;
        for (let i = 0; i < device.data.length; i++) {
            if (request.query.id == device.data[i].deviceId) {
                flag = true;
                response.send(device.data[i]);
                console.log('----------查询单项成功----------');
                break;
            }
        }
        if (!flag) {
            console.log('----------未找到要查询的数据----------')
            response.send({ "msg": "未找到要查询的数据" });
        }
    })
})

//http://localhost:8989/server/pagination?pageNum=0&pageSize=3 分页查询第1页，每页3条数据
app.get('/server/pagination', (request, response) => {
    requestInit(request, response);
    fs.readFile('./deviceData.json', function (err, data) {
        if (err) {
            console.error(err);
        }
        let device = data.toString();
        device = JSON.parse(device);
        let pagedevice = device.data.slice((request.query.pageNum - 1) * request.query.pageSize, (request.query.pageNum) * request.query.pageSize);
        console.log('-----------分页查询成功-------------');
        response.send(pagedevice);
    })
})

app.get('/server/getAll', (request, response) => {
    requestInit(request, response);
    fs.readFile('./deviceData.json', function (err, data) {
        if (err) {
            response.send({ "msg": "查询失败，后端出错了" });
            return console.error(err);
        }
        let device = data.toString();//将读取二进制的数据转换为字符串
        device = JSON.parse(device);//将字符串转换为json对象
        console.log('----------查询所有成功-------------');
        response.send(device.data);
        // response.send(request.body);
    })
})

app.delete('/server/deleteById', (request, response) => {//根据url中的id删除，http://localhost:8989/server/deleteById?id=101
    requestInit(request, response);
    fs.readFile('./deviceData.json', function (err, data) {
        if (err) {
            return console.error(err);
        }
        let device = data.toString();
        device = JSON.parse(device);
        //把数据读出来删除
        let flag = false;
        for (let i = 0; i < device.data.length; i++) {
            if (request.query.id == device.data[i].deviceId) {
                flag = true;
                device.data.splice(i, 1);
            }
        }
        device.total = device.data.length;
        let str = JSON.stringify(device);
        //然后再把数据写进去
        fs.writeFile('./deviceData.json', str, function (err) {
            if (err) {
                console.error(err);
            }
            if (flag) {
                console.log("----------删除成功------------");
                response.send({ "msg": "删除成功" });//把查询到要删除的详细数据返回
            }
            else {
                console.log("----------未找到要删除的数据------------");
                response.send({ "msg": "未找到要删除的数据" })
            }
        })
    })
})

app.listen(8989, () => {
    console.log('服务已经启动，端口8989监听中...');
})