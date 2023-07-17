const superagent = require('superagent');
const { readFileSync, writeFileSync } = require('fs');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)), SLEEP = 1000;

const Tip = `## 祝贺：本帖成为本域中首个超过 100 用户查看的帖子，且是全域查看数量最高的帖子！

## 军团介绍

- 军团是 HLOI 开发的娱乐功能，未经过官方认可。
- 军团内的成员使用统一的头像，经过一些 Rating 计算算法计算平均 Rating（可以理解为实力值）。
- 军团内有一些成员成为管理员，其他成员称为普通成员。
- 普通成员只有进入、退出某个军团的能力，而管理员的更多权利为：踢出某个成员，取消某个成员为管理员，提拔某个成员为管理员，从数据库**手动**刷新数据（每天自动刷新）。
- 一个军团内的管理员数量需小于等于 $\\left\\lfloor\\dfrac n5+0.5\\right\\rfloor$，其中 $n$ 是团队的成员总数。
- 目前本域共有 4 个军团，具体将在下面介绍。

## 脚本

| 脚本名 | 用法 | 说明 |
| -: | :- | :- |
| \`join\` | \`join:<legionId>;\` | 加入一个军团 |
| \`exit\` | \`exit:<legionId>[,<userId>];\` | 退出一个军团。当 \`<userid>\` 非空时，踢出某个成员（仅管理员可用） |
| \`notice\` | \`notice:<legionId>,<notice>;\` | 设置军团公告（支持 Markdown，内容不要包含英文分号或逗号，你可以在 [这里](./64ad293a59e1ea388169b511/raw) 找到当前的 Markdown 代码，仅军团管理员可用） |
| \`admin\` | \`admin:<legionId>,<userId>;\` | 调整一个军团的管理员，将其管理属性取反（仅管理员可用） |
| \`update\` | \`update:0;\` | 立即从数据库更新数据（仅管理员可用） |

注：

- legionId 处填写军团 ID，按照用法中的格式发送在评论区即可，会在 15 秒内处理完毕；
- 请不要发送多余空格，且保证标点符号为半角；
- 发送时请删除尖括号，且中括号内的部分是可选参数；
- **不要发送代码块**，直接发送文本（具体见评论区域示例）；
- 脚本**不会处理已经被回复过的**评论！！！
- 请自觉设置头像（允许作微小修改），违者加入团队黑名单。
- 如果你希望贡献 Rating 算法：
  - 首先我很懒，既然已经有了一个还算正常的算法，就懒得写新的了；
  - 所以你可以去 [Molmin/LegionWorker](https://github.com/Molmin/LegionWorker.git) 贡献算法（你可以 Pull Request）。

**特别注意：** 你可以在军团公告里宣传自己的军团，但不要在本帖评论区宣传 **单个军团**，谢谢。`;

var COOKIE = '', PASS = readFileSync('password', 'utf8').trim(),
  users = JSON.parse(readFileSync('rating.json', 'utf8')),
  DATA = JSON.parse(readFileSync('data.json', 'utf8'));

function findLegion(legion) {
  for (var i = 0; i < DATA.legion.length; i++)
    if (DATA.legion[i].id == legion) return i;
  return -1;
}

function getNowLegion(user) {
  for (var i = 0; i < DATA.legion.length; i++)
    if (DATA.legion[i].member.includes(user)) return DATA.legion[i].id;
  return null;
}

async function ensureLogin() {
  await sleep(SLEEP);
  await superagent
    .post(`https://oj.hailiangedu.com/login`)
    .send({
      uname: 'Milmon',
      password: PASS,
      tfa: '',
      authnChallenge: ''
    })
    .set('Accept', `application/json`)
    .then(res => {
      var cookies = res.headers['set-cookie'];
      cookies.forEach((cookie, index) => {
        cookies[index] = cookie.split(';')[0];
      });
      COOKIE = cookies.join('; ');
    })
    .catch(err => console.log(`Failed`));
}

async function checkLogin() {
  var login = false;
  await sleep(SLEEP);
  await superagent
    .get(`https://oj.hailiangedu.com/p/P1`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .then(res => {
      if (res.body.pdoc) login = true;
    })
    .catch(err => console.log(`Failed`));
  return login;
}

async function getRanking() {
  var nowPage = 1, cntPage = 1;
  while (nowPage <= cntPage) {
    await sleep(SLEEP);
    await superagent
      .get(`https://oj.hailiangedu.com/d/hlxly2022/ranking`)
      .query({ page: nowPage })
      .set('Accept', `application/json`)
      .set('Cookie', COOKIE)
      .then(res => {
        cntPage = res.body.upcount;
        // delete res.body.UiContext;
        writeFileSync('tmp.json', JSON.stringify(res.body, null, '  '));
        console.log(res.body)
      })
      .catch(err => console.log(`Failed`));
    nowPage++;
  }
}

async function publish() {
  writeFileSync('data.json', JSON.stringify(DATA, null, '    '));
  writeFileSync('rating.json', JSON.stringify(users, null, '    '));
  DATA.legion = DATA.legion.sort((x, y) => {
    return y.member.length - x.member.length
  });
  var Markdown = Tip;
  Markdown += `\n\n全域管理员名单：\n\n`;
  DATA.admin.forEach(uid => {
    Markdown += `- [](/user/${uid})\n`;
  });
  Markdown += `\n---\n\n`;
  for (var legion of DATA.legion) {
    var md = `## ${legion.name}\n\n本军团 ID 为 \`${legion.id}\`，共 ${legion.member.length} 人。\n\n`;
    if (legion.admin.length > 0) {
      md += `### 本军团管理员\n\n`;
      legion.admin.forEach(uid => {
        md += `- [](/user/${uid})\n`;
      });
      md += `\n`;
    }
    if (legion.notice.length > 0)
      md += `### 公告\n\n${legion.notice}\n\n`;
    var totalMember = 0, RP = { sum: 0, contest: 0, practice: 0 }, id;
    for (var member of legion.member)
      if (users[String(member)] && users[String(member)].rpSum >= 100) totalMember++;

    legion.member = legion.member.sort((x, y) => {
      var xrp = users[String(x)] ? users[String(x)].rp.practice : 0;
      var yrp = users[String(y)] ? users[String(y)].rp.practice : 0;
      return yrp - xrp;
    });
    id = totalMember;
    for (var member of legion.member) {
      if (users[String(member)] && users[String(member)].rpSum >= 100)
        RP.practice += users[String(member)].rp.practice * id, id--;
    }
    RP.practice /= (1 + totalMember) * totalMember / 2;

    legion.member = legion.member.sort((x, y) => {
      var xrp = users[String(x)] ? users[String(x)].rp.contest : 0;
      var yrp = users[String(y)] ? users[String(y)].rp.contest : 0;
      return yrp - xrp;
    });
    id = totalMember;
    for (var member of legion.member) {
      if (users[String(member)] && users[String(member)].rpSum >= 100)
        RP.contest += users[String(member)].rp.contest * id, id--;
    }
    RP.contest /= (1 + totalMember) * totalMember / 2;

    legion.member = legion.member.sort((x, y) => {
      var xrp = users[String(x)] ? users[String(x)].rpSum : 0;
      var yrp = users[String(y)] ? users[String(y)].rpSum : 0;
      return yrp - xrp;
    });
    id = totalMember;
    for (var member of legion.member)
      if (users[String(member)] && users[String(member)].rpSum >= 100)
        RP.sum += users[String(member)].rpSum * id, id--;
    RP.sum /= (1 + totalMember) * totalMember / 2;

    md += `### 军团水平\n\n| 参与计算总人数 | 综合水平 | 比赛水平 | 练习水平 |\n| :-: | :-: | :-: | :-: |\n| ${totalMember} | ${(RP.sum.toFixed(2))} [](sum) | ${RP.contest.toFixed(2)} [](contest) | ${RP.practice.toFixed(2)} [](practice) |\n\n`;
    md += `### 成员\n\n| 所属小组 | 成员 | Rating | 比赛分 | 练习分 |\n| -: | :- | :-: | :-: | :-: |\n`;
    for (var member of legion.member) {
      if (!users[String(member)] || users[String(member)].rpSum < 100)
        md += `| | [](/user/${member}) | 该用户暂未参与统计。 | 该用户暂未参与统计。 | 该用户暂未参与统计。 |\n`;
      else md += `| ${['', '入门', '普及', '提高', '省选'][users[String(member)].group]} | [](/user/${member}) | **${users[String(member)].rpSum.toFixed(0)}** [](${member}#sum) | ${users[String(member)].rp.contest.toFixed(0)} [](${member}#contest) | ${users[String(member)].rp.practice.toFixed(0)} [](${member}#practice) |\n`;
    }
    Markdown += `${md}\n`;
  }
  Markdown += `## 常见问题
- **问题** 为什么我加入了 A，B 两组，显示的是某一组？
**答案** 经过综合考虑，“加入两个组别且活跃于更低的一组” 的人数远高于 “加入两个组别且活跃于更高的一组”，所以代码中用更低的组别计算。如果你认为这种计算方式不合理，请联系管理员特判你的 UID。
- **问题** 为什么 “该用户暂未参与统计”？
**答案** 为了防止低水平用户或未参加训练用户拉低军团水平，所以不统计 Rating 低于 100 的用户。
  `
  Markdown += `---\n\nPublished by Molmin/LegionWorker at ${new Date().toLocaleString()} (Content Version ${DATA.version})`;
  await sleep(SLEEP);
  await superagent
    .post(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511/edit`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .send({ title: '四大军团', operation: 'update', content: Markdown, pin: 'on' })
    .then(res => {
      console.log(`Published!`);
    })
    .catch(err => console.log(`Failed`));
}

async function deleteReply(drid) {
  await sleep(SLEEP);
  await superagent
    .post(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .send({ drid, operation: 'delete_reply' })
    .then(res => {
      console.log(`Deleted reply #${drid}`);
    })
    .catch(err => console.log(`Failed`));
}

async function check() {
  if (!(await checkLogin())) await ensureLogin();
  await sleep(SLEEP);
  await superagent
    .get(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .then(res => {
      var Reply = res.body.drdocs;
      Reply.forEach(async reply => {
        async function getError(err) {
          await sleep(SLEEP);
          await superagent
            .post(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511`)
            .set('Accept', `application/json`)
            .set('Cookie', COOKIE)
            .send({ drid: reply.docId, operation: 'tail_reply', content: `Error: ${err}` })
            .then(res => {
              console.log(`Errored on reply #${reply.docId} (${err})`);
            })
            .catch(err => console.log(err));
        }
        if ((!reply.reply || reply.reply.length == 0)
          && (/^[a-z]*?:[\s\S]*?;/.test(reply.content)
            || /`[a-z]*?:[\s\S]*?;/.test(reply.content))) {
          var op, vals, user = reply.owner;
          if (/^[a-z]*?:[\s\S]*?;/.test(reply.content))
            op = /^([a-z]*?):([\s\S]*?);/.exec(reply.content);
          else op = /`([a-z]*?):([\s\S]*?);/.exec(reply.content);
          vals = op[2], op = op[1];
          console.log(op, vals, user, reply.docId);
          if (!(['exit', 'join', 'update', 'admin', 'notice'].includes(op))) {
            await getError('Operation error.'); return;
          }
          if (op == 'update') {
            if (!DATA.admin.includes(user)) {
              await getError('No permission.'); return;
            }
            DATA.version++;
            await deleteReply(reply.docId);
            await updateRating();
            await publish();
          }
          if (op == 'admin') {
            if (!DATA.admin.includes(user)) {
              await getError('No permission.'); return;
            }
            var legion = vals.split(',')[0], uid = Number(vals.split(',')[1]);
            if (findLegion(legion) == -1) {
              await getError('Cannot find this legion.'); return;
            }
            if (DATA.legion[findLegion(legion)].admin.includes(uid))
              DATA.legion[findLegion(legion)].admin =
                DATA.legion[findLegion(legion)].admin.filter(u => u != uid)
            else DATA.legion[findLegion(legion)].admin.push(uid);
            DATA.version++;
            await deleteReply(reply.docId);
            await publish();
          }
          if (op == 'notice') {
            var legion = vals.split(',')[0], content = vals.split(',')[1];
            if (findLegion(legion) == -1) {
              await getError('Cannot find this legion.'); return;
            }
            if (!DATA.legion[findLegion(legion)].admin.includes(user)
              && !DATA.admin.includes(user)) {
              await getError('No permission.'); return;
            }
            DATA.legion[findLegion(legion)].notice = content;
            DATA.version++;
            await deleteReply(reply.docId);
            await publish();
          }
          if (op == 'join') {
            var legion = vals, uid = user;
            if (vals.split(',').length >= 2)
              legion = vals.split(',')[0], uid = Number(vals.split(',')[1]);
            if (findLegion(legion) == -1) {
              await getError('Cannot find this legion.'); return;
            }
            if (vals.split(',').length >= 2) {
              if (!DATA.admin.includes(user)) {
                await getError('No permission.'); return;
              }
            }
            var nowLegion = getNowLegion(uid);
            if (nowLegion != null) {
              await getError('Already in one legion.'); return;
            }
            DATA.legion[findLegion(legion)].member.push(uid), DATA.version++;
            await deleteReply(reply.docId);
            await publish();
          }
          if (op == 'exit') {
            var legion = vals, uid = user;
            if (vals.split(',').length >= 2)
              legion = vals.split(',')[0], uid = Number(vals.split(',')[1]);
            if (findLegion(legion) == -1) {
              await getError('Cannot find this legion.'); return;
            }
            if (vals.split(',').length >= 2) {
              if (!DATA.admin.includes(user) && !DATA.legion[findLegion(legion)].admin.includes(user)) {
                await getError('No permission.'); return;
              }
            }
            var nowLegion = getNowLegion(uid);
            if (nowLegion != legion) {
              await getError('Not yet in this legion.'); return;
            }
            DATA.legion[findLegion(legion)].member
              = DATA.legion[findLegion(legion)].member.filter(u => u != uid), DATA.version++;
            await deleteReply(reply.docId);
            await publish();
          }
        }
      });
    })
    .catch(err => console.log(`Failed`));
}

const WEEKLY_CONTESTS = [
  '64a7e5d659e1ea38815d1d11',
  '64b164432723396d990b4afd'
], WEEKLY_CONTESTS_RATE = 5,
  groupLevel = { 入门班: 1, 普及班: 2, 普及转提高班: 3, 提高转省选班: 4 };
async function updateRating() {
  users = {};
  if (!(await checkLogin())) await ensureLogin();
  console.log(`Calculating Users' Ratings ...`);
  var startAt = new Date().getTime();

  // Obtain the user's group
  await sleep(SLEEP);
  console.log(`Getting Group of Users ...`);
  await superagent
    .get(`https://oj.hailiangedu.com/d/hlxly2022/domain/group`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .then(res => {
      var groups = res.body.groups;
      groups.forEach(group => {
        if (!groupLevel[group.name]) return;
        var level = groupLevel[group.name];
        group.uids.forEach(uid => {
          if (!users[String(uid)])
            return users[String(uid)] = {
              uid, group: level, rp: { contest: 0, practice: 0, rank: 0 },
              tmp: 0, totalContest: 0, totalHomework: 0
            };
          else if (users[String(uid)].group > level)
            users[String(uid)].group = level;
        });
      });
    })
    .catch(err => console.log(`Failed`));
  for (var uid of [127, 79, 321]) users[String(uid)].group = 3;

  // Calculate the results of all trainings, 
  //   homework, and contests comprehensively
  await sleep(SLEEP);
  var totalContest = { '1': 0, '2': 0, '3': 0, '4': 0 };
  await superagent
    .get(`https://oj.hailiangedu.com/d/hlxly2022/contest`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .then(async res => {
      for (var contestId in res.body.tsdict) {
        var tdoc = 0;
        while (res.body.tdocs[tdoc].docId != contestId) tdoc++;
        tdoc = res.body.tdocs[tdoc];
        if (new Date(tdoc.beginAt).getTime() <
          new Date('2023-07-04').getTime()) continue;
        console.log(`Calculating Contest #${tdoc.docId}`);
        var group = groupLevel[tdoc.assign[0]];
        const rate = WEEKLY_CONTESTS.includes(tdoc.docId) ? WEEKLY_CONTESTS_RATE : 1;
        await sleep(SLEEP);
        await superagent
          .get(`https://oj.hailiangedu.com/d/hlxly2022/contest/${tdoc.docId}/scoreboard`)
          .set('Accept', `application/json`)
          .set('Cookie', COOKIE)
          .then(res => {
            for (var uid in users) users[uid].tmp = 0;
            var rank = 0, total = 0, lastScore = -1,
              rows = res.body.rows, sumscore = 0, totalPerson = 0;
            for (var row of rows) {
              if (row[0].value == '#' || row[0].value == '0') continue;
              if (!users[String(row[1].raw)]) continue;
              if (group && group != users[String(row[1].raw)].group) continue;
              if (row[2].value == 0) continue;

              total++; if (row[2].value != lastScore)
                rank = total, lastScore = row[2].value;

              users[String(row[1].raw)].tmp = row[2].value,
                sumscore += row[2].value;
              if (row[2].value) totalPerson++;
            }
            if (sumscore != 0) {
              if (group) totalContest[String(group)]++;
              else for (var i = 1; i <= 4; i++)
                totalContest[String(i)] += rate;
              for (var uid in users) {
                users[uid].rp.contest += sqrt(users[uid].tmp / (sumscore / totalPerson)) * 200 * rate;
                if (users[uid].tmp >= 1) users[uid].totalContest += rate;
              }
            }
          })
          .catch(err => console.log(`Failed`));
      }
    })
    .catch(err => console.log(`Failed`));
  for (var uid in users) {
    users[uid].rp.contest /= totalContest[String(users[uid].group)],
      users[uid].rp.contest *= Math.sqrt(users[uid].totalContest / totalContest[String(users[uid].group)]);
    users[uid].rpSum = users[uid].rp.contest;
  }

  var totalHomework = { '1': 0, '2': 0, '3': 0, '4': 0 };
  for (var pageId = 1; pageId <= 2; pageId++) {
    await sleep(SLEEP);
    await superagent
      .get(`https://oj.hailiangedu.com/d/hlxly2022/homework`)
      .query({ page: pageId })
      .set('Accept', `application/json`)
      .set('Cookie', COOKIE)
      .then(async res => {
        for (var tdoc of res.body.tdocs) {
          if (new Date(tdoc.beginAt).getTime() <
            new Date('2023-07-03').getTime()) continue;
          console.log(`Calculating Homework #${tdoc.docId}`);
          var group = groupLevel[tdoc.assign[0]];
          if (tdoc.docId == '64a8e12559e1ea3881605be4'
            || tdoc.docId == '64b214512723396d990f8b92') group = -1;
          if (!group) continue;
          await sleep(SLEEP);
          await superagent
            .get(`https://oj.hailiangedu.com/d/hlxly2022/homework/${tdoc.docId}/scoreboard`)
            .set('Accept', `application/json`)
            .set('Cookie', COOKIE)
            .then(res => {
              for (var uid in users) users[uid].tmp = 0;
              var rank = 0, total = 0, lastScore = -1, rows = res.body.rows, sumscore = 0, totalPerson = 0;
              for (var row of rows) {
                if (row[0].value == '#' || row[0].value == '0') continue;
                if (!users[String(row[1].raw)]) continue;
                if (group != -1 && group != users[String(row[1].raw)].group) continue;
                if (row[2].value == 0) continue;

                total++; if (row[2].value != lastScore)
                  rank = total, lastScore = row[2].value;

                users[String(row[1].raw)].tmp = row[2].value,
                  sumscore += row[2].value;
                if (row[2].value) totalPerson++;
              }
              if (sumscore != 0) {
                if (group != -1) totalHomework[String(group)]++;
                else for (var i = 1; i <= 4; i++)
                  totalHomework[String(i)]++;
                for (var uid in users) {
                  users[uid].rp.practice += users[uid].tmp / (sumscore / totalPerson) * 150;
                  if (users[uid].tmp >= 1) users[uid].totalHomework++;
                }
              }
            })
            .catch(err => console.log(`Failed`));
        }
      })
      .catch(err => console.log());
  }
  for (var uid in users) {
    users[uid].rp.practice /= totalHomework[String(users[uid].group)],
      users[uid].rp.practice *= Math.sqrt(users[uid].totalHomework / totalHomework[String(users[uid].group)]);
    users[uid].rpSum += users[uid].rp.practice;
  }

  var endAt = new Date().getTime();
  console.log(`Done in ${((endAt - startAt) / 1000).toFixed(2)}s.`);
}

async function MAIN() {
  await ensureLogin();
  console.log(`Logined.`);
  while (true) {
    await check();
    await sleep(5000);
  }
}

MAIN();
