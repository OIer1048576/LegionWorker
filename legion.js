const superagent = require('superagent');
const { readFileSync, writeFileSync } = require('fs');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)), SLEEP = 300;
const { getColor, Colors } = require('./color.js');

const Tip = `## 祝贺：本帖成为本域中首个超过 100 用户查看的帖子，且一直保持全域查看数量最高！

### 军团介绍

- 军团是 HLOI 开发的娱乐功能，未经过官方认可。
- 军团内的成员使用统一的头像（可能有微小修改），经过一些 Rating 计算算法计算平均 Rating（可以理解为实力值）。
- 军团内有一些成员成为管理员，其他成员称为普通成员。
- 关于用户权限：
  - 普通成员：加入军团 & 退出所在军团；
  - 军团管理员：将成员移出军团 & 设置公告；
  - 系统管理员：将成员拉入军团 & 重新计算 Rating & 设置军团管理员。
- 一个军团内的管理员数量需小于等于 $\\left\\lfloor\\dfrac n5+0.5\\right\\rfloor$，其中 $n$ 是团队的成员总数。

### 脚本

| 脚本名 | 用法 | 说明 |
| -: | :- | :- |
| \`join\` | \`join:<legionId>;\` | 加入一个军团 |
| \`exit\` | \`exit:<legionId>[,<userId>];\` | 退出一个军团。当 \`<userid>\` 非空时，踢出某个成员（仅管理员可用） |
| \`notice\` | \`notice:<legionId>,<notice>;\` | 设置军团公告（支持 Markdown，内容不要包含英文分号或逗号，你可以在 [这里](./64ad293a59e1ea388169b511/raw) 找到当前的 Markdown 代码，仅军团管理员可用） |
| \`admin\` | \`admin:<legionId>,<userId>;\` | 调整一个军团的管理员，将其管理属性取反（仅管理员可用） |
| \`update\` | \`update:0;\` | 立即从数据库更新数据（仅管理员可用） |

### 提示

- legionId 处填写军团 ID，按照用法中的格式发送在评论区即可，会在 15 秒内处理完毕；
- 请不要发送多余空格，且保证标点符号为半角；
- 发送时请删除尖括号，且中括号内的部分是可选参数；
- **不要发送代码块**，直接发送文本（具体见评论区域示例）；
- 脚本**不会处理已经被回复过的**评论！！！
- 如果你希望贡献 Rating 算法：
  - 首先我很懒，既然已经有了一个还算正常的算法，就懒得写新的了；
  - 所以你可以去 [Molmin/LegionWorker](https://github.com/Molmin/LegionWorker.git) 贡献算法（你可以 Pull Request）；
  - 当前计算规则：
    
    <details>
    <summary>点此展开 / 收起</summary>

    ### 计算某场比赛/作业/训练的表现

    设比赛/作业/训练参与的人的 UID 组成的集合为 $S$, $\\operatorname{score}_{c} x$ 表示 UID 为 $x$ 的人在 $c$ 比赛/作业/训练中的得分, 则在这场比赛/作业/训练中, UID 为 $p$ 的人的表现为:

    $$
    \operatorname{perf}_c x = F\\left(\\dfrac{|S| \\cdot \\operatorname{score}_c x}{ \\sum_{s \\in S} \\operatorname{score}_c s} \\right)^P.
    $$

    其中对于比赛, $F = 2, P = 50$, 对于作业/训练, $F=1.5,P=120$.

    ### 计算比赛/作业/训练的总 Rating

    设 $g$ 是一个小组. 设在所有分配到 $g$ 小组的比赛组成的集合为 $S_1$, 所有分配到 $g$ 小组的作业组成的集合为 $S_2$, 所有分配到 $g$ 小组的训练组成的集合为 $S_3$. 对于比赛/作业/训练 $c$, 我们定义

    $$
    M(c) = \\begin{cases} 5 & c~\\text{是周赛}, \\ 1 &  c~\\text{不是周赛}. \\end{cases}
    $$

    (注意, 任意作业/训练的 $R$ 为 $1$.)

    设 $x$ 是在 $g$ 小组中的一个人. ta 参与的全体比赛组成的集合为 $T_1$, ta 参与的全体作业组成的集合为 $T_2$, ta 参与的全体训练组成的集合为 $T_3$, 设

    $$
    \\begin{aligned}
    r_i(x) = \\dfrac{|T_i|^{0.5} \\sum_{t \\in T_i} M(t) \\operatorname{perf}_t x}{|S_i|^{1.5}},
    \\end{aligned}
    $$

    则 $x$ 的比赛分 $R_1$ 为 $r_1(x)$, $x$ 的练习分 $R_2$ 为 $r_2(x) + r_3(x)$.

    ### 处理前三加分

    考虑一个小组 $g$, 我们定义一个函数 $N(g)$ 将入门 $\\mapsto 1$, 普及 $\\mapsto 2$, 提高 $\\mapsto 3$, 省选 $\\mapsto 4$. 再定义一个函数

    $$
    T(x) = \\begin{cases} 0.6 & x = 1, \\\\ 0.4 & x = 2, \\\\ 0.3 & x = 3, \\\\ 0 & x \\ge 4. \\end{cases}
    $$

    设 $x$ 是在 $g$ 小组中的一个人. ta 参与的全体比赛组成的集合为 $T_1$, 对于一个比赛 $c$, 我们定义 $\\operatorname{rank}_c x$ 是 $x$ 在 $c$ 比赛排名. 则 $x$ 的前三加分为:

    $$
    R_3 = \\sum_{t \\in T_1} T\\left(\\operatorname{rank}_c x\\right) N(g)^2,
    $$

    最终的 Rating 为:

    $$
    R_{\\rm final} = R_1 + R_2 + R_3.
    $$

    </details>
- 颜色列表：${Colors.map(color => `<font color="${color}">⭓</font>`).join('')}

**特别注意：** 你可以在军团公告里宣传自己的军团，但不要在本帖评论区宣传 **单个军团**，谢谢。

### 致谢

感谢 [](/user/899) 对本项目的贡献（<https://github.com/Molmin/LegionWorker/pull/2>）`;

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

function calcLegionRating() {
  for (var legionId in DATA.legion) {
    var legion = DATA.legion[legionId];
    var totalMember = 0, RP = { sum: 0, contest: 0, practice: 0, rank: 0 }, id;
    for (var member of legion.member)
      if (users[String(member)] && users[String(member)].rpSum >= 60) totalMember++;

    legion.member = legion.member.sort((x, y) => {
      var xrp = users[String(x)] ? users[String(x)].rp.practice : 0;
      var yrp = users[String(y)] ? users[String(y)].rp.practice : 0;
      return yrp - xrp;
    });
    id = totalMember;
    for (var member of legion.member) {
      if (users[String(member)] && users[String(member)].rpSum >= 60)
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
      if (users[String(member)] && users[String(member)].rpSum >= 60)
        RP.contest += users[String(member)].rp.contest * id, id--;
    }
    RP.contest /= (1 + totalMember) * totalMember / 2;

    legion.member = legion.member.sort((x, y) => {
      var xrp = users[String(x)] ? users[String(x)].rp.rank.sum : 0;
      var yrp = users[String(y)] ? users[String(y)].rp.rank.sum : 0;
      return yrp - xrp;
    });
    id = totalMember;
    for (var member of legion.member) {
      if (users[String(member)] && users[String(member)].rpSum >= 60)
        RP.rank += users[String(member)].rp.rank.sum * id, id--;
    }
    RP.rank /= (1 + totalMember) * totalMember / 2;

    legion.member = legion.member.sort((x, y) => {
      var xrp = users[String(x)] ? users[String(x)].rpSum : 0;
      var yrp = users[String(y)] ? users[String(y)].rpSum : 0;
      return yrp - xrp;
    });
    id = totalMember;
    for (var member of legion.member)
      if (users[String(member)] && users[String(member)].rpSum >= 60)
        RP.sum += users[String(member)].rpSum * id, id--;
    RP.sum /= (1 + totalMember) * totalMember / 2;

    DATA.legion[legionId].rating = RP;
    DATA.legion[legionId].totalMember = totalMember;
  }
}

async function publish(ratingMarkdown) {
  calcLegionRating();
  DATA.legion = DATA.legion.sort((x, y) => {
    return y.rating.sum - x.rating.sum
  });
  writeFileSync('data.json', JSON.stringify(DATA, null, '    '));
  writeFileSync('rating.json', JSON.stringify(users, null, '    '));
  var Markdown = Tip;
  Markdown += `\n\n系统管理员：\n\n`;
  DATA.admin.forEach(uid => {
    Markdown += `- [](/user/${uid})\n`;
  });
  Markdown += `\n---\n\n`;
  for (var legion of DATA.legion) {
    var md = `## ${legion.name}\n\n本军团 ID 为 \`${legion.id}\`，共 ${legion.member.length} 人。\n\n`;
    if (legion.admin.length > 0) {
      md += `### 管理员\n\n`;
      legion.admin.forEach(uid => {
        md += `- [](/user/${uid})\n`;
      });
      md += `\n`;
    }
    if (legion.notice.length > 0)
      md += `### 公告\n\n${legion.notice}\n\n`;

    md += `### 军团水平\n\n| 参与计算总人数 | 综合水平 | 比赛水平 | 练习水平 | 加分 |\n`
      + `| :-: | :-: | :-: | :-: | :-: |\n| ${legion.totalMember} | `
      + `${(legion.rating.sum.toFixed(2))} [](sum) | `
      + `${legion.rating.contest.toFixed(2)} [](contest) | `
      + `${legion.rating.practice.toFixed(2)} [](practice) |`
      + `${legion.rating.rank.toFixed(2)} [](rank) |\n\n`;
    md += `### 成员\n\n| 小组 | 成员 | Rating | 比赛分 | 练习分 | 加分 |\n| -: | :- | :-: | :-: | :-: | :-: |\n`;
    for (var member of legion.member) {
      if (!users[String(member)])
        md += `| | [](/user/${member}) | 该用户暂未参与统计。 | 该用户暂未参与统计。 | 该用户暂未参与统计。 | 该用户暂未参与统计。 |\n`;
      else {
        var displayRP = String(users[String(member)].rpSum.toFixed(0));
        if (users[String(member)].rpSum < 60)
          displayRP = `(${displayRP})`;
        md += `| ${['', '入门', '普及', '提高', '省选'][users[String(member)].group]} | `
          + `[](/user/${member}) | **<font color="${getColor(users[String(member)].rpSum)}">`
          + `${displayRP}</font>** [](${member}#sum) | `
          + `<font color="${getColor(users[String(member)].rp.contest * 2)}">`
          + `${users[String(member)].rp.contest.toFixed(0)}</font> [](${member}#contest) | `
          + `<font color="${getColor(users[String(member)].rp.practice * 2)}">`
          + `${users[String(member)].rp.practice.toFixed(0)}</font> [](${member}#practice) |`
          + `<font color="${getColor(users[String(member)].rp.rank.sum * 10)}">`
          + `${users[String(member)].rp.rank.sum.toFixed(0)}</font> [](${member}#practice) |\n`;
      }
    }
    Markdown += `${md}\n`;
  }
  Markdown += `\n\n---\n\n## 常见问题

- **Q：** 为什么我加入了 A，B 两组，显示的是某一组？
  
  **A：** 经过综合考虑，“加入两个组别且活跃于更低的一组” 的人数远高于 “加入两个组别且活跃于更高的一组”，所以代码中用更低的组别计算。如果你认为这种计算方式不合理，请联系管理员特判你的 UID。
  
- **Q：** 为什么 “该用户暂未参与统计”？
  
  **A：** 为了防止低水平用户或未参加训练用户拉低军团水平，所以不统计 Rating 低于 60 的用户。`
  Markdown += `\n\n---\n\nPublished by Molmin/LegionWorker at ${new Date().toLocaleString()} (Content Version ${DATA.version})`;
  await sleep(SLEEP);
  await superagent
    .post(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511/edit`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .send({ title: `五大军团`, operation: 'update', content: Markdown, pin: 'on' })
    .then(res => {
      console.log(`Published!`);
    })
    .catch(err => console.log('Failed'));
  await sleep(SLEEP);
  await superagent
    .post(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .send({ content: ratingMarkdown, drid: '64b8a428877c608172353364', operation: 'edit_reply' })
    .then(res => {
      console.log(`Updated Ranking!`);
    })
    .catch(err => console.log('Failed'));
}

function rankingMarkdown() {
  const rankColors = { gold: '#ebd511', silver: '#c5c5c5', bronze: '#c57534', none: '#ddd' };
  var content = '';
  content += `## 全站 Rating 排行榜

<details>
<summary>点此展开 / 收起</summary>

| 成员 | 总分 / 比赛 / 练习 / 加分 / **<font color="${rankColors.gold}">金</font>**`
    + ` / **<font color="${rankColors.silver}">银</font>** / **<font color="${rankColors.bronze}">铜</font>** |
| :- | :- |\n`;
  var publishdata = new Array();
  for (var uid in users)
    publishdata.push(users[uid]);
  publishdata.sort((x, y) => y.rpSum - x.rpSum);
  for (var user of publishdata)
    if (user.rpSum >= 0.001)
      content += `| [](/user/${user.uid}) | **<font color="${getColor(user.rpSum)}">`
        + `${user.rpSum.toFixed(0)}</font>** [](${user.uid}#sum) / `
        + `<font color="${getColor(user.rp.contest * 2)}">`
        + `${user.rp.contest.toFixed(0)}</font> [](${user.uid}#contest) / `
        + `<font color="${getColor(user.rp.practice * 2)}">`
        + `${user.rp.practice.toFixed(0)}</font> [](${user.uid}#practice) / `
        + `<font color="${getColor(user.rp.rank.sum * 10)}">`
        + `${user.rp.rank.sum.toFixed(0)}</font> [](${user.uid}#rank)`
        + ' / ' + (user.rp.rank.gold
          ? `**<font color="${rankColors.gold}">${user.rp.rank.gold}</font>**`
          : `<font color="${rankColors.none}">0</font>`)
        + ' / ' + (user.rp.rank.silver
          ? `**<font color="${rankColors.silver}">${user.rp.rank.silver}</font>**`
          : `<font color="${rankColors.none}">0</font>`)
        + ' / ' + (user.rp.rank.bronze
          ? `**<font color="${rankColors.bronze}">${user.rp.rank.bronze}</font>**`
          : `<font color="${rankColors.none}">0</font>`) + '\n';
  content += `\n</details>`;
  return content;
}

async function deleteReply(drid) {
  var failed = true;
  while (failed) {
    failed = false;
    await sleep(SLEEP);
    await superagent
      .post(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511`)
      .set('Accept', `application/json`)
      .set('Cookie', COOKIE)
      .send({ drid, operation: 'delete_reply' })
      .then(res => {
        console.log(`Deleted reply #${drid}`);
      })
      .catch(err => { console.log(`Failed at Delete`); if (err) failed = true; });
  }
}

async function check() {
  if (!(await checkLogin())) await ensureLogin();
  await sleep(SLEEP);
  await superagent
    .get(`https://oj.hailiangedu.com/d/hlxly2022/discuss/64ad293a59e1ea388169b511`)
    .set('Accept', `application/json`)
    .set('Cookie', COOKIE)
    .then(async res => {
      var Reply = res.body.drdocs, newComment = false;
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
        if (!DATA.comments.includes(reply.docId))
          DATA.comments.push(reply.docId), newComment = true;
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
            newComment = false;
            await deleteReply(reply.docId);
            if (vals == 'rating') await updateRating();
            await publish(rankingMarkdown());
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
            newComment = false;
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
            newComment = false;
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
            newComment = false;
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
            newComment = false;
            await deleteReply(reply.docId);
            await publish();
          }
        }
      });
      // if (newComment) await publish();
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
  var startAt = new Date().getTime(), failed;

  // Obtain the user's group
  console.log(`Getting Group of Users ...`);
  failed = true;
  while (failed) {
    failed = false;
    await sleep(SLEEP);
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
                uid, group: level, rp: {
                  contest: 0, practice: 0,
                  rank: { gold: 0, silver: 0, bronze: 0, sum: 0 }
                }, tmp: 0, rank: 0, totalContest: 0, totalHomework: 0
              };
            else if (users[String(uid)].group > level)
              users[String(uid)].group = level;
          });
        });
      })
      .catch(err => { console.log(err); if (err) failed = true; });
  }
  for (var uid of [46]) users[String(uid)].group = 4;
  for (var uid of [127, 79, 321]) users[String(uid)].group = 3;
  for (var uid of [177, 835]) users[String(uid)].group = 2;

  // Calculate the results of all trainings, 
  //   homework, and contests comprehensively
  failed = true;
  while (failed) {
    failed = false;
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
          var failed2 = true;
          while (failed2) {
            failed2 = false;
            await sleep(SLEEP);
            await superagent
              .get(`https://oj.hailiangedu.com/d/hlxly2022/contest/${tdoc.docId}/scoreboard`)
              .set('Accept', `application/json`)
              .set('Cookie', COOKIE)
              .then(res => {
                for (var uid in users) users[uid].tmp = 0;
                var groupRank = {}, rows = res.body.rows, sumscore = 0, totalPerson = 0;
                for (var i = 1; i <= 4; i++)
                  groupRank[String(i)] = { now: 0, last: -1, total: 0 };
                for (var row of rows) {
                  if (row[0].value == '#' || row[0].value == '0') continue;
                  if (!users[String(row[1].raw)]) continue;
                  if (group && group != users[String(row[1].raw)].group) continue;
                  if (row[2].value == 0) continue;

                  var rank;
                  if (group) {
                    groupRank[String(group)].total++;
                    if (row[2].value != groupRank[String(group)].last)
                      groupRank[String(group)].rank = rank = groupRank[String(group)].total,
                        groupRank[String(group)].last = row[2].value;
                  } else {
                    var tmp = users[String(row[1].raw)].group;
                    groupRank[String(tmp)].total++;
                    if (row[2].value != groupRank[String(tmp)].last)
                      groupRank[String(tmp)].rank = rank = groupRank[String(tmp)].total,
                        groupRank[String(tmp)].last = row[2].value;
                  }
                  users[String(row[1].raw)].rank = rank,
                    users[String(row[1].raw)].tmp = row[2].value,
                    sumscore += row[2].value;
                  if (row[2].value) totalPerson++;
                }
                if (sumscore != 0) {
                  if (group) totalContest[String(group)]++;
                  else for (var i = 1; i <= 4; i++)
                    totalContest[String(i)] += rate;
                  for (var uid in users) {
                    if (users[uid].rank == 1) users[uid].rp.rank.gold++;
                    if (users[uid].rank == 2) users[uid].rp.rank.silver++;
                    if (users[uid].rank == 3) users[uid].rp.rank.bronze++;
                    users[uid].rp.contest += Math.pow(users[uid].tmp / (sumscore / totalPerson), 2) * 50 * rate;
                    if (users[uid].tmp >= 1) users[uid].totalContest += rate;
                  }
                }
              })
              .catch(err => (console.log(`Failed`), err && (failed2 = true)));
          }
        }
      })
      .catch(err => (console.log(`Failed`), err && (failed = true)));
  }
  for (var uid in users) {
    users[uid].rp.contest /= totalContest[String(users[uid].group)],
      users[uid].rp.contest *= Math.sqrt(users[uid].totalContest / totalContest[String(users[uid].group)]);
    users[uid].rpSum = users[uid].rp.contest;
    users[uid].rp.rank.sum += users[uid].rp.rank.gold * 0.3 * Math.pow(users[uid].group, 2);
    users[uid].rp.rank.sum += users[uid].rp.rank.silver * 0.19 * Math.pow(users[uid].group, 2);
    users[uid].rp.rank.sum += users[uid].rp.rank.bronze * 0.1 * Math.pow(users[uid].group, 2);
    users[uid].rpSum += users[uid].rp.rank.sum;
  }

  var totalHomework = { '1': 0, '2': 0, '3': 0, '4': 0 };
  for (var pageId = 1; pageId <= 2; pageId++) {
    failed = true;
    while (failed) {
      failed = false;
      await sleep(SLEEP);
      await superagent
        .get(`https://oj.hailiangedu.com/d/hlxly2022/training`)
        .query({ page: pageId })
        .set('Accept', `application/json`)
        .set('Cookie', COOKIE)
        .then(async res => {
          for (var tid in res.body.tdict) {
            var tdoc = res.body.tdict[tid];
            var group = 0;
            if (tdoc.title.startsWith('【入门组】')) group = 1;
            if (tdoc.title.startsWith('【普及组】')) group = 2;
            if (tdoc.title.startsWith('【提高组】')) group = 3;
            if (tdoc.title.startsWith('【提高转省选】')) group = 4;
            if (!group) continue;
            console.log(`Calculating Training #${tdoc.docId}`);

            var failed2 = true;
            while (failed2) {
              failed2 = false;
              await sleep(SLEEP);
              await superagent
                .get(`https://oj.hailiangedu.com/d/hlxly2022/training/${tdoc.docId}/scoreboard`)
                .set('Accept', `application/json`)
                .set('Cookie', COOKIE)
                .then(res => {
                  for (var uid in users) users[uid].tmp = 0;
                  var rank = 0, total = 0, lastScore = -1, rows = res.body.rows, sumscore = 0, totalPerson = 0;
                  for (var row of rows) {
                    if (row[0].value == '#' || row[0].value == '0') continue;
                    if (!users[String(row[1].raw)]) continue;
                    if (group != users[String(row[1].raw)].group) continue;
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
                      users[uid].rp.practice += Math.pow(users[uid].tmp / (sumscore / totalPerson), 1.5) * 120;
                      if (users[uid].tmp >= 1) users[uid].totalHomework++;
                    }
                  }
                })
                .catch(err => (console.log(`Failed`), err && (failed2 = true)));
            }
          }
        })
        .catch(err => (console.log(`Failed`), err && (failed = true)));
    }
  }
  for (var pageId = 1; pageId <= 2; pageId++) {
    failed = true;
    while (failed) {
      failed = false;
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
            var group = groupLevel[tdoc.assign[0]];
            if (tdoc.docId == '64a8e12559e1ea3881605be4'
              || tdoc.docId == '64b214512723396d990f8b92') group = -1;
            if (!group) continue;
            console.log(`Calculating Homework #${tdoc.docId}`);

            var failed2 = true;
            while (failed2) {
              failed2 = false;
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
                      users[uid].rp.practice += Math.pow(users[uid].tmp / (sumscore / totalPerson), 1.5) * 120;
                      if (users[uid].tmp >= 1) users[uid].totalHomework++;
                    }
                  }
                })
                .catch(err => (console.log(`Failed`), err && (failed2 = true)));
            }
          }
        })
        .catch(err => (console.log(`Failed`), err && (failed = true)));
    }
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
