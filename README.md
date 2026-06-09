# ChronoFlow - 个人时区调度器

> 打破朝九晚五，根据你的昼夜节律智能分配任务。

ChronoFlow 是一个纯前端个人效率工具。用户记录每日精力状态，工具在本地拟合出"个人精力曲线"，并将高难度任务自动排布在精力波峰，机械任务排在波谷。

## 核心功能

- **精力打卡** — 5 级精力评分，一键记录当前状态
- **精力曲线** — 基于历史数据拟合 24 小时精力曲线，波峰/波谷可视化
- **智能调度** — 按认知负荷自动将任务排入最佳时段
- **波峰提醒** — 浏览器 Notification 在精力高峰时提醒处理高难度任务
- **离线优先** — 所有数据存储在 LocalStorage，无需后端

## 技术栈

| 类别 | 选型 |
|------|------|
| 语言 | TypeScript |
| 框架 | React 18 (函数组件 + Hooks) |
| 状态管理 | Zustand (persist 中间件) |
| 图表 | Recharts |
| 日期处理 | date-fns |
| 样式 | TailwindCSS |
| 构建 | Vite |
| 测试 | Vitest + jsdom |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview

# 运行测试
npm test

# 测试监听模式
npm run test:watch
```

## 项目结构

```
src/
├── types/index.ts               # TS 接口定义
├── utils/algorithms.ts          # 核心算法（曲线拟合 + 任务调度）
├── store/useChronoFlowStore.ts   # Zustand Store + LocalStorage 持久化
├── components/
│   ├── EnergyTracker.tsx        # 精力打卡组件
│   ├── ChronoChart.tsx          # 精力曲线图表
│   └── TaskManager.tsx          # 任务管理 + 排程展示
├── hooks/
│   └── useSmartNotifications.ts # 智能通知 Hook
├── __tests__/
│   ├── algorithms.test.ts       # 算法单元测试（15 个）
│   └── store.test.ts            # Store 单元测试（10 个）
├── App.tsx                      # 应用入口
└── main.tsx                     # 渲染入口
```

## 数据结构

```typescript
// 精力打卡记录
interface EnergyLog {
  id: string;
  timestamp: number;      // Unix 时间戳
  hourOfDay: number;      // 0-23
  energyLevel: number;    // 1-5
}

// 任务定义
interface Task {
  id: string;
  title: string;
  cognitiveLoad: number;  // 认知负荷 1-5
  estimatedMinutes: number;
}

// 精力曲线数据点
interface EnergyCurvePoint {
  hour: number;              // 0-23
  predictedEnergy: number;   // 0.0 - 5.0
}

// 调度结果
interface ScheduledItem {
  task: Task;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  zone: 'peak' | 'valley' | 'neutral';
}
```

## 核心算法

### 精力曲线拟合 (`generateEnergyCurve`)

1. 收集过去 7 天的 `EnergyLog`
2. 将 24 小时划分为 24 个桶
3. 每个桶内计算**指数衰减加权平均值**（半衰期 2 天，越近的记录权重越高）
4. 缺失数据桶使用**循环线性插值**填充
5. **移动平均平滑**（窗口大小 5，循环边界），消除突变折角

### 智能任务调度 (`scheduleTasks`)

1. 识别波峰（`predictedEnergy >= 3.5`）和波谷（`predictedEnergy < 2.5`）时段
2. 高认知负荷任务（≥4）优先排入波峰
3. 低认知负荷任务（≤2）排入波谷
4. 中等任务排入剩余可用时段
5. 支持跨小时放置，按时段精力降序贪心分配

### 智能通知 (`useSmartNotifications`)

- 使用 **Web Worker**（内联 Blob）实现后台保活定时器，防止浏览器休眠导致通知失效
- Worker 创建失败时回退到 `requestAnimationFrame` 方案
- 5 分钟防抖，避免频繁通知
- 仅在波峰时段且存在高难度待办任务时触发

## 测试

项目包含 25 个单元测试，覆盖核心算法和状态管理。

### 算法测试 (`algorithms.test.ts` — 15 个)

| 测试项 | 说明 |
|--------|------|
| 无数据时返回默认曲线 | 24 个点均为 3.0 |
| 单条记录对应桶值正确 | 该小时预测值接近记录的 energyLevel |
| 指数衰减权重验证 | 近期记录权重高于远期记录 |
| 同桶多条记录加权平均 | 结果介于最小值与最大值之间 |
| 平滑处理后无突变折角 | 相邻小时差值 < 1.5 |
| 超过 7 天记录被过滤 | 超期记录不影响曲线 |
| 输出包含 0-23 所有小时间 | 24 个数据点完整 |
| 高认知负荷任务排入波峰 | cognitiveLoad ≥ 4 → peak 时段 |
| 低认知负荷任务排入波谷 | cognitiveLoad ≤ 2 → valley 时段 |
| 中等认知负荷任务排入中性时段 | 无波峰波谷时 → neutral 时段 |
| 多任务按认知负荷降序调度 | 高难度优先占据波峰 |
| 波峰容量不足时回退 | 溢出任务排入其他可用时段 |
| 空任务列表返回空排程 | 边界条件 |
| 任务可跨小时放置 | estimatedMinutes > 60 时正确跨时段 |
| getCurrentEnergy 返回当前精力 | 与当前小时对应 |

### Store 测试 (`store.test.ts` — 10 个)

| 测试项 | 说明 |
|--------|------|
| 初始状态为空 | logs/tasks 均为空数组 |
| addLog 添加精力记录 | 自动填充 timestamp 和 hourOfDay |
| addLog 多次打卡累加 | 记录数递增 |
| removeLog 删除指定记录 | 按 id 精确删除 |
| addTask 添加任务 | 字段完整保留 |
| removeTask 删除指定任务 | 按 id 精确删除 |
| getEnergyCurve 无数据返回默认 | 24 个 3.0 点 |
| getEnergyCurve 有数据返回拟合曲线 | 当前小时预测值 > 3.0 |
| getSchedule 返回排程结果 | 任务正确调度 |
| 数据持久化 | Zustand persist 中间件自动同步 LocalStorage |

## 使用流程

1. **打卡** — 在一天中不同时间点点击精力等级按钮记录状态
2. **查看曲线** — 积累几天数据后，精力曲线会逐渐成型
3. **添加任务** — 输入任务名称、认知负荷和预计时长
4. **查看排程** — 系统自动将任务排入最佳时段，绿色为波峰、红色为波谷
5. **接收提醒** — 授权通知后，精力波峰时会收到高难度任务提醒

## 许可

MIT
