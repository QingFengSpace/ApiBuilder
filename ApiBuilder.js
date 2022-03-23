const express = require('express');
const cors = require('cors');//引入跨域模块，不然易导致跨域问题
const app = express();
const mysql = require('mysql');
app.use(cors());
app.use(express.json());//解析request.body内容json格式
app.use(express.urlencoded({ extended: false }));

/**使用示例：
 * get-根据url中的id查询http://localhost:8989/server/getById/1001, req.params.id获取参数, getById?id=3则用req.query.num
 * get-分页查询第1页每页3条http://localhost:8989/server/pagination/1/3
 * post-增加单个设备http://localhost:8989/server/add; data:JSON.stringfy({id:101, name:"王五"})
 * put-根据data中的id修改单个设备http://localhost:8989/server/update; data:JSON.stringfy({id:101, name:"张三"})
 * delete-根据url中的id删除，http://localhost:8989/server/deleteById/1001
 */

// var pool = mysql.createPool({//配置连接池使用示例
//     host: 'localhost',
//     user: 'root',
//     password: 'root',
//     database: 'demo',
//     port: 3306
// });
// var selectSQL = 'select * from user limit 10';
// pool.getConnection(function (err, conn) {
//     if (err) console.log("POOL ==> " + err);
//     conn.query(selectSQL, function (err, rows) {
//         if (err) console.log(err);
//         console.log("SELECT ==> ");
//         for (var i in rows) {
//             console.log(rows[i]);
//         }
//         conn.release();//释放连接
//     });
// });

const connect = mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'demo'
})

let reconnectCount=0;
setInterval(function () {
    connect.query('SELECT 1');
	console.log(new Date().toLocaleString() + ` 为防止Mysql断连，每隔7.5小时进行重连，已重连${++reconnectCount}次`);
}, 7.5*60*60*1000);

let requestCount = 0;// console.log(typeof 123); // number
function requestInit(req, res) {//给请求配置跨域
    requestCount++;
    let IP=req.headers['x-forwarded-for']!=null?req.headers['x-forwarded-for']:req.ip;
    console.log(new Date().toLocaleString() + ` 第${requestCount}次发来请求,IP为${IP}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, OPTIONS, DELETE');
}

app.get('/server/getAll', (req, res) => {
    requestInit(req, res);
    let sql = `select * from deviceinfo`
    let query = connect.query(sql, (err, result) => {
        console.log(query.sql);
        if (err) {
            console.log("操作失败" + err);
        } else {
            console.log("操作成功");
            for (const index in result) {
                result[index].position = JSON.parse(result[index].position);
                result[index].angles = JSON.parse(result[index].angles);
                result[index].alwaysOnTop = result[index].alwaysOnTop == 1;
            }
            res.send(result);
        }
    })
})

app.get('/server/getById/:id', (req, res) => {//req.params.id获取参数, getById?id=3则用req.query.num
    requestInit(req, res);
    let sql = `select * from deviceinfo where deviceId=${mysql.escape(req.params.id)}`//escape()防止sql注入
    let query = connect.query(sql, (err, result) => {
        console.log(query.sql);
        if (err) {
            console.log("操作失败" + err);
        } else {
            console.log("操作成功");
            for (const index in result) {
                result[index].position = JSON.parse(result[index].position);
                result[index].angles = JSON.parse(result[index].angles);
                result[index].alwaysOnTop = result[index].alwaysOnTop == 1;
            }
            res.send(result);
        }
    })
})

app.get('/server/pagination/:num/:size', (req, res) => {//分页查询
    requestInit(req, res);
    let sql = `select * from deviceinfo limit ?,?`//?防止sql注入,connect.query会自动调用connect.escape([parm1,param2])
    let query = connect.query(sql, [(req.params.num - 1) * req.params.size, req.params.size * 1], (err, result) => {//size*1防止转为字符串
        console.log(query.sql);
        if (err) {
            console.log("操作失败" + err);
        } else {
            console.log("操作成功");
            for (const index in result) {
                result[index].position = JSON.parse(result[index].position);
                result[index].angles = JSON.parse(result[index].angles);
                result[index].alwaysOnTop = result[index].alwaysOnTop == 1;
            }
            res.send(result);
        }
    })
})

app.post('/server/add', (req, res) => {
    requestInit(req, res);
    req.body.position = JSON.stringify([Math.round(req.body.position[0] * 100) / 100, Math.round(req.body.position[1] * 100) / 100, Math.round(req.body.position[2] * 100) / 100]);
    req.body.angles = JSON.stringify([Math.round(req.body.angles[0] * 10) / 10, Math.round(req.body.angles[1] * 10) / 10, Math.round(req.body.angles[2] * 10) / 10]);
    req.body.alwaysOnTop = req.body.alwaysOnTop == true ? 1 : 0;

    let sql = 'insert into deviceinfo set ?';//?防止sql注入,connect.query会自动调用escape(req.body)
    let query = connect.query(sql, req.body, (err, result) => {
        console.log(query.sql);
        if (err) {
            console.log("操作失败" + err);
        } else {
            console.log("操作成功");
            res.send(result);
        }
    })
})

app.put('/update', (req, res) => {
    requestInit(req, res);

    let sql = `update tb_stock_entry set ? where entryId=?`//?防止sql注入
    let sql2 = `update tb_stock_entry_detail set ? where id=?`//?防止sql注入
    let query = connect.query(sql, [req.body.entry, req.body.entry.entryId], (err, result) => {
        console.log(query.sql);
        if (err) {
            console.log("操作1失败" + err);
        } else {
            console.log("操作1成功");
        }
    })

    for (let index in req.body.entryDetailList) {
        let query2 = connect.query(sql2, [req.body.entryDetailList[index], req.body.entryDetailList[index].id], (err, result) => {
            console.log(query2.sql);
            if (err) {
                console.log("操作2失败" + err);
            } else {
                console.log("操作2成功");
            }
        })
    }
    res.send("所有操作成功");
})

app.put('/server/update', (req, res) => {
    requestInit(req, res);
    req.body.position = JSON.stringify([Math.round(req.body.position[0] * 100) / 100, Math.round(req.body.position[1] * 100) / 100, Math.round(req.body.position[2] * 100) / 100]);
    req.body.angles = JSON.stringify([Math.round(req.body.angles[0] * 10) / 10, Math.round(req.body.angles[1] * 10) / 10, Math.round(req.body.angles[2] * 10) / 10]);
    req.body.alwaysOnTop = req.body.alwaysOnTop == true ? 1 : 0;

    let sql = `update deviceinfo set ? where deviceId=?`//?防止sql注入
    let query = connect.query(sql, [req.body, req.body.deviceId], (err, result) => {
        console.log(query.sql);
        if (err) {
            console.log("操作失败" + err);
        } else {
            console.log("操作成功");
            res.send(result);
        }
    })
})

app.delete('/server/deleteById/:id', (req, res) => {
    requestInit(req, res);
    let sql = `delete from deviceinfo where deviceId=?`//?防止sql注入
    let query = connect.query(sql, req.params.id, (err, result) => {
        console.log(query.sql);
        if (err) {
            console.log("操作失败" + err);
        } else {
            console.log("操作成功");
            res.send(result);
        }
    })
})

app.listen(8989, () => {
    console.log(new Date().toLocaleString() + ' 服务已启动，端口8989监听中...');
})