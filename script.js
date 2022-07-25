const backend = localStorage.getItem("backend");

const getReqKey = () => {
    var t = new Date();
    var year = t.getFullYear();
    var month = t.getMonth()+1;
    if (String(month).length == 1) month = "0"+String(month);
    var date = t.getDate();
    if (date.length == 1) date = "0"+date;
    return md5(localStorage.getItem("apikey")+year+month+date);
}

function getParam(reqParam) {
    reqParam = reqParam.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const paraReg = new RegExp('[\\?&]' + reqParam + '=([^&#]*)');
    const results = paraReg.exec(window.location);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

const cgto = (page) => {
    document.getElementById("config_page").style.opacity = 0;
    document.getElementById("ctrl_page").style.opacity = 0;
    document.getElementById("status_page").style.opacity = 0;
    document.getElementById("init_page").style.opacity = 0;
    setTimeout(() => {
        document.getElementById("config_page").style.display = "none";
        document.getElementById("ctrl_page").style.display = "none";
        document.getElementById("status_page").style.display = "none";
        document.getElementById("init_page").style.display = "none";
        document.getElementById(page).style.display = "block";
        setTimeout(() => {
            document.getElementById(page).style.opacity = 1;
        }, 50);
    }, 300);

    // document.getElementById(page).style.display = "block";
    // sleep(100);
    // document.getElementById(page).style.opacity = 1;
}



const getStatus = async () => {
    if (!backend) return false;
    console.info("开始同步数据");
    document.getElementById("st_ctrl_address").innerText = localStorage.getItem("backend") + "/";
    let status = await fetch(backend+"/api/ok").then(res => res.json()).then(res => {return res});
    if (status.ok) {
        document.getElementById("now_status").innerText = "正常运行";
        document.getElementById("status_word").innerText = "一切运行正常。";
    } else {
        document.getElementById("now_status").innerText = "运行错误";
        document.getElementById("status_word").innerText = "被控端配置异常或正在关机。";
    }
    if (status.internet) {
        document.getElementById("st_internet").innerText = "正常";
    } else {
        document.getElementById("st_internet").innerText = "黑名单屏蔽部分域名中";
    }
    let config = await fetch(backend+"/api/getRawConfig?isClient").then(res => res.json()).then(res => {return res});
    // console.log(config.usr1time)
    document.getElementById("st_usr1time").innerText = config["usr1time"] + "s";
    document.getElementById("st_usr2time").innerText = config["usr2time"] + "s" || "Null";
    document.getElementById("st_usr3time").innerText = config["usr3time"] + "s" || "Null";
    console.info("同步数据完成");
}

const run = async () => {
    if (!localStorage.getItem("backend") || !localStorage.getItem("apikey")) {
        console.log("Init Failed.");
        document.getElementById("status_page").style.display = "none";
        document.getElementById("init_page").style.display = "block";
        document.getElementById("init_page").style.opacity = 1;
        return false;
    }
    await getStatus();
}

run();

const init = () => {
    localStorage.setItem("backend", document.getElementById("init_address").value);
    localStorage.setItem("apikey", document.getElementById("init_apikey").value);
    window.location.reload();
}

const shutdown = () => {
    var reqKey = getReqKey();
    mdui.dialog({
        title: '关机',
        content: '您正在进行关机操作，是否继续关机？',
        buttons: [
          {
            text: '取消'
          },
          {
            text: '确认',
            onClick: function(inst){
                fetch(backend+"/api/shutdown?"+reqKey).then(res => res.json()).then(res => {
                    if (res.status == 200) {
                        mdui.alert('请等待关机，如需取消，请点击【取消关机】', '关机成功');
                    } else {
                        mdui.alert('请检查控制台报错并重试。', '关机失败');
                    }
                }); 
            }
          }
        ]
    });
}

const stopShutdown = () => {
    var reqKey = getReqKey();
    mdui.dialog({
        title: '取消关机',
        content: '您正在进行取消关机操作，是否继续？',
        buttons: [
          {
            text: '取消'
          },
          {
            text: '确认',
            onClick: function(inst){
                fetch(backend+"/api/stop?"+reqKey).then(res => res.json()).then(res => {
                    if (res.status == 200) {
                        mdui.alert('请等待取消操作，如需关机，请点击【关机】', '取消成功');
                    } else {
                        mdui.alert('请检查控制台报错并重试。', '取消失败');
                    }
                }); 
            }
          }
        ]
    });
}

const tmptime = () => {
    var reqKey = getReqKey();
    mdui.prompt('请输入需要调整的用户 ID', '临时调整使用时间',
        function (usr) {
            mdui.prompt('请输入修改后的时长（单位为秒）', '为 ID'+usr+' 临时调整使用时间',
                function (time) {
                    fetch(backend+"/api/tmptime?"+reqKey+"&"+time+"&"+usr).then(res => res.json()).then(res => {
                        if (res.status == 200) {
                            mdui.alert('修改时间成功！', '成功');
                        } else {
                            mdui.alert('请检查控制台报错并重试。', '失败');
                        }
                    }); 
                }
            );
        }
    );

}

setInterval(getStatus, 3500);

if (getParam("page")) {
    var pgid = getParam("page");
    switch(pgid) {
        case "init":
            cgto("init_page");
            break;
        case "status":
            cgto("status_page");
            break;
        case "config":
            cgto("config_page");
            break;
        case "ctrl":
            cgto("ctrl_page");
            break;
        default:
            cgto("status_page");
            break;
    }
}

const syncConfig = () => {
    fetch(backend+"/api/getRawConfig").then(res => res.text()).then(res => {
        document.getElementById("config_area").value = res;
        mdui.alert("同步成功！");
    }); 
}

const setConfig = () => {
    var reqKey = getReqKey();
    var config = document.getElementById("config_area").value;
    try {
        var jsonConfig = JSON.parse(config);
    } catch (e) {
        mdui.alert("JSON 解析失败！错误："+e);
        return false;
    }
    var uri = "?"+reqKey;
    for (let i in jsonConfig) {
        uri += `&${i}=${jsonConfig[i]}`;
    }
    fetch(backend+"/api/updateConfig"+uri).then(res => res.json()).then(res => {
        if (res.status == 200) {
            mdui.alert("提交成功！", "成功");
            syncConfig();
        } else {
            mdui.alert('请检查控制台报错并重试。', '失败');
        }
    }); 
}

const cgShutdownMode = () => {
    // “什么鬼啊！还要用户自己修改”
    // mdui.alert("请前往 设置 -> shutdownType 进行修改, shutdown 代表关机，ban 代表屏蔽网络。", "此入口未开放");
    var reqKey = getReqKey(); 
    mdui.dialog({
        title: '请选择关机模式',
        content: '请选择关机模式。',
        buttons: [
          {
            text: '关机',
            onClick: function(inst) {
                fetch(backend+"/api/getRawConfig").then(res => res.json()).then(res => {
                    res.shutdownType = "shutdown";
                    var uri = "?"+reqKey;
                    for (let i in res) {
                        uri += `&${i}=${res[i]}`;
                    }
                    fetch(backend+"/api/updateConfig"+uri).then(res => res.json()).then(res => {
                        if (res.status == 200) {
                            mdui.alert("提交成功！", "成功");
                            syncConfig();
                        } else {
                            mdui.alert('请检查控制台报错并重试。', '失败');
                        }
                    }); 
                });
            }
          },
          {
            text: '屏蔽互联网',
            onClick: function(inst){
                fetch(backend+"/api/getRawConfig").then(res => res.json()).then(res => {
                    res.shutdownType = "ban";
                    var uri = "?"+reqKey;
                    for (let i in res) {
                        uri += `&${i}=${res[i]}`;
                    }
                    fetch(backend+"/api/updateConfig"+uri).then(res => res.json()).then(res => {
                        if (res.status == 200) {
                            mdui.alert("提交成功！", "成功");
                            syncConfig();
                        } else {
                            mdui.alert('请检查控制台报错并重试。', '失败');
                        }
                    }); 
                });
            }
          }
        ]
      });
    cgto("config_page");
}

const cgBlacklist = () => {
    var reqKey = getReqKey();
    mdui.prompt('请输入修改后解析的地址', '修改屏蔽黑名单',
        function (ip) {
            mdui.prompt('请输入屏蔽的网址列表，以空格分隔', '修改屏蔽黑名单',
                function (banlist) {
                    var bantxt = "";
                    var banArray = banlist.split(" ");
                    for (let i = 0; i < banArray.length;i++) {
                        bantxt += "&"+banArray[i];
                    }
                    fetch(backend+"/api/updateBan?"+reqKey+"&"+ip+bantxt).then(res => res.json()).then(res => {
                        if (res.status == 200) {
                            mdui.alert('修改黑名单成功！', '成功');
                        } else {
                            mdui.alert('请检查控制台报错并重试。', '失败');
                        }
                    }); 
                },
                function () {},
                {
                    type: "textarea"
                }
            );
        },
        function () {},
        {
            defaultValue: "127.0.0.1",
        }
    );
}