# Google 翻译分屏查看器 — 设计文档

## 概述

一个 Chrome 扩展（MV3），在英文网页上一键开启分屏视图：左侧显示 Google 翻译的中文译文，右侧显示英文原文，两边同步滚动。

## 用户流程

1. 用户在任意英文网页点击扩展图标
2. 当前页面替换为左右分屏 overlay：左 = translate.google.com 翻译，右 = 原文 iframe
3. 滚动任意一侧，另一侧按比例同步
4. 通过分割线上的控制栏切换布局（左右/上下）、对调位置（翻译↔原文）、或关闭分屏
5. 右键扩展图标 → 设置面板，修改默认语言、布局等偏好

## 架构

```
manifest.json             # MV3 扩展配置
background.js             # Service Worker，监听图标点击
content.js                # 内容脚本，all_frames: true
content.css               # 分屏 UI 样式
options.html              # 设置页面（语言、布局、比例等）
options.js                # 设置页面逻辑
assets/icon.png           # 扩展图标
```

### 通信流程

```
background.js  ←→  content.js (main frame)  ←→  content.js (left iframe)
                     ↑                           content.js (right iframe)
                     └── chrome.runtime.sendMessage
                         用于: 图标点击 toggle、接收加载状态

iframe 之间滚动同步:
  left iframe content.js  ──postMessage──▶  window.top
  window.top  ──postMessage──▶  right iframe contentWindow
```

## 分屏 UI

- 创建 overlay 容器覆盖整个页面，包含两个 iframe
- 默认 50:50 分割，分割线可拖拽调整比例
- 分割线中间放置半透明控制栏，三个按钮：
  - 切换布局（左右 ↔ 上下）
  - 对调位置（翻译 ↔ 原文）
  - 关闭分屏
- Esc 键也可关闭分屏
- 再次点击扩展图标 = toggle 关闭

## 滚动同步

- 用户主动滚动的 iframe 作为同步源，另一个跟随
- 传输滚动百分比（0~1），各 iframe 按自身高度换算
- 100ms 防抖 + 锁标记防止死循环
- 若 window 不可滚动，查找内部最大可滚动元素
- 一边未加载完时不发送同步消息

## 偏好设置

存储在 `chrome.storage.sync`：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetLang | string | zh-CN | 目标翻译语言 |
| layout | string | horizontal | horizontal(左右) / vertical(上下) |
| translatedFirst | boolean | true | 翻译内容在左/上 |
| splitRatio | number | 50 | 分割比例 30~70 |

设置入口：
- 点击扩展图标 → `chrome.action.onClicked` 触发，直接在当前页面开启/关闭分屏（无 popup）
- 右键扩展图标 → Chrome 原生 "选项" 菜单 → 打开 options.html 设置页面

## 权限

```json
{
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"],
    "all_frames": true
  }]
}
```

## 边界处理

| 场景 | 处理 |
|------|------|
| 非 HTML 页面 | toast 提示"此页面不支持分屏"，不创建 overlay |
| 已分屏再点图标 | toggle 关闭分屏 |
| 翻译加载失败 | 左侧显示错误提示，右侧原文正常 |
| 原文加载失败 | 右侧显示错误提示，左侧翻译正常 |
| 页面缩放/窗口大小变化 | 监听 resize，自动调整布局 |
| 导航离开 | overlay 随页面一起消失 |
