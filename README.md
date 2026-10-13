# AegisData · 企业数据安全管理平台

> 让 AI 助手访问企业文件这件事变得**可判定、可拦截、可追溯**：每次取数先过权限关卡，拒绝就真的读不到，每一次判定都留下证据。

**在线演示：** https://franci4.github.io/aegisdata/

**代码仓库：** https://github.com/Franci4/aegisdata

---

## 这是什么

本项目使用**虚构企业"星河科技"的模拟数据**，演示 AI 助手访问企业内部文件时的权限控制能力。全部文件内容均为编造的模拟数据，不含任何真实企业机密或真实个人信息。

演示页面包含四个板块：

| 板块 | 内容 |
| --- | --- |
| 访问控制台 | 选择角色 / 文件 / 操作发起申请，查看三种判定结果与实际执行状态 |
| 审计日志 | 统计、多维筛选、明细表，点任意记录查看完整 9 项日志字段 |
| 权限规则 | 3 角色 × 3 文件 × 2 操作共 18 条组合的权限矩阵与测试用例 |
| 系统说明 | 项目背景、第一阶段目标、架构分工与五阶段路线 |

## 核心机制

**文件清单**

| 文件编号 | 文件名 | 内容 | 敏感等级 |
| --- | --- | --- | --- |
| F001 | monthly_business_report.txt | 虚构销售额、订单量、业务情况 | INTERNAL |
| F002 | monthly_finance_report.txt | 虚构收入、支出、预算差异 | CONFIDENTIAL |
| F003 | salary_data.txt | 虚构员工标识及工资金额 | SENSITIVE |

**权限规则**

| 用户角色 | F001 普通业务报告 | F002 内部财务报告 | F003 敏感工资表 |
| --- | --- | --- | --- |
| employee 普通员工 | 读 允许 / 导 允许 | 读 **拒绝** / 导 **待审批** | 读 拒绝 / 导 拒绝 |
| finance 财务人员 | 读 允许 / 导 允许 | 读 允许 / 导 允许 | 读 拒绝 / 导 拒绝 |
| admin 管理员 | 读 允许 / 导 允许 | 读 允许 / 导 允许 | 读 允许 / 导 允许 |

**三种决策**

| 决策 | 含义 | 是否执行文件操作 |
| --- | --- | --- |
| `ALLOW` | 权限检查通过 | 是，执行成功后记录实际结果 |
| `DENY` | 权限不足或规则不允许 | 否，在文件操作之前拦截 |
| `PENDING_APPROVAL` | 操作需要人工审批 | 否，审批完成前不得执行 |

**审计日志 9 个字段：** `id` / `timestamp` / `request_id` / `user_role` / `file_id` / `action` / `decision` / `reason` / `executed`

## 快速开始

**看效果（最简单）**
双击 `AegisData.html`，浏览器打开即用。CSS、脚本、四个页面全部内联在这一个文件里，不依赖任何外部资源，断网也能运行。

**本地开发**
```bash
python -m http.server 8000
# 访问 http://localhost:8000/src/prototype/index.html
```

**重新打包单文件版**（改了 `src/` 之后）
```bash
node build-single.js
```

**部署到 GitHub Pages**
```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1 -User Franci4 -Repo aegisdata
```

## 目录结构

```
aegisdata/
├── index.html              网站入口（单文件版，GitHub Pages 首页）
├── AegisData.html          同上，给别人的文件名更明确
├── src/                    网站源码
│   ├── prototype/          四个页面：控制台 / 审计日志 / 权限规则 / 系统说明
│   └── static/             style.css（设计令牌在顶部）+ app.js（数据层与路由）
├── docs/                   文档
│   ├── PRD.md              产品需求文档
│   ├── 启动说明.md          运行、演示与开发约定
│   ├── screenshots/        成品截图
│   └── materials/          规则来源的原始素材
├── build-single.js         把 src/ 打包成单文件版
└── deploy.ps1              一键部署到 GitHub Pages
```

## 与后端对接的位置

`src/static/app.js` 中的 `resolve()` 是**唯一的判定入口**，目前查的是前端预置的演示数据表 `DEMO_DECISIONS`。
接入后端后整段替换该函数即可，页面层代码不需要改动：

```python
# policy.py
def check_permission(user_role, file_id, action):
    return {"decision": "ALLOW", "reason": "..."}
```

```
POST /api/access
入参：user_role / file_id / action
出参：request_id / decision / reason / executed
```

## 安全约束

1. 未知用户角色、未知文件编号、未知操作类型**不得默认放行**。
2. 权限判定与文件操作**必须分离**，判定统一由后端策略函数给出。
3. `DENY` 与 `PENDING_APPROVAL` 必须在**真实文件操作之前**拦截。
4. `executed` 必须反映真实执行情况，不得写死，也不得随页面提示随意填写。
5. 受保护文件不放在网页静态路径下，不能通过静态 URL 直接访问。

## 当前进度

第一阶段（企业内部文件与财务数据访问控制）前端已完成。判定结果目前由前端预置演示数据模拟，接入后端策略函数后必须整体移除。

---

本项目为演示用途，页面中的权限规则是为展示目的设计的示例策略，不代表所有企业都应采用相同的权限设置。
