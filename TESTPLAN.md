# E2E Test Plan

## Environment

- Framework: WebdriverIO (Mocha)
- Browser: Microsoft Edge (headless)
- Server: Static file server on port 4567 serving `e2e/` directory
- Each test page mocks `@tauri-apps/api/core` invoke for UI testing

---

## Existing Tests

### 1. Bubble Viewport (已存在)
- **File**: `e2e/bubble.test.cjs` + `e2e/test-page.html`
- **What it tests**: Bubble stays within viewport when opening/closing panel
- **持久化**: 无
- **清理**: 无

---

## Planned Tests

### 2. Open Folder Button & Error Toast
| Panel | 按钮位置 |
|-------|---------|
| Engine Row | `onOpenFolder` → `bridge.openFolder(e.entity.directory)` |
| Proj Row | `onOpenFolder` → `bridge.openFolder(e.entity.directory)` |
| Asset Row | `onOpenFolder` → `bridge.openFolder(e.entity.directory)` |
| Tool Row | `onOpenFolder` → `bridge.openFolder(e.entity.directory)` |

- **场景 A**: 路径有效 → `openFolder` 被调用，无错误
- **场景 B**: 路径无效/空 → `openFolder` reject → Toast 显示错误信息
- **场景 C**: 路径含 Windows 反斜杠 → 被 normalize 为正斜杠
- **持久化**: 无
- **清理**: 无

### 3. Path Normalization
- **Bug**: Windows 路径 `C:\foo\bar` → 需转为 `C:/foo/bar`
- **场景 A**: `"C:\\foo\\bar"` → `"C:/foo/bar"`
- **场景 B**: `"C:/foo/bar"` → `"C:/foo/bar"` (不变)
- **场景 C**: 路径含首尾引号 → 去掉引号
- **持久化**: 无
- **清理**: 无

### 4. File vs Directory Detection (open_folder)
- **Bug**: 之前 `open_folder` 对文件和目录没有区分
- **场景 A**: 路径是目录 → 调用 `open` (explorer)
- **场景 B**: 路径是文件 → 调用 `showItemInFolder` (选中文件)
- **持久化**: 无
- **清理**: 无

### 5. I18n (国际化)
- **场景 A**: 中英文切换后所有面板标签正确显示
- **场景 B**: 缺少的 i18n key → fallback 显示 key 本身
- **场景 C**: 插值参数 `{name}` 被正确替换
- **Bug fixed**: 补全了大量缺失的翻译条目（engine.placeholder_*, proj.switch_to_*, date.*, diary.*, common.*, tag.* 等）
- **持久化**: 无 (language 设置保存在 DB，但测试 mock 不持久化)
- **清理**: 无

### 6. Settings Panel - Theme Toggle
- **场景 A**: 点击 switch → 从 light 切到 dark
- **场景 B**: 再次点击 → 切回 light
- **场景 C**: `data-theme` attribute 正确设置
- **持久化**: 无 (theme 只存储在 DOM 中)
- **清理**: 无

### 7. Settings Panel - Language Switch
- **场景 A**: 切换到 en_US → 面板标签变为英文
- **场景 B**: 切换到 zh_CN → 面板标签变为中文
- **持久化**: 设置保存到 DB，测试用 mock 不持久化
- **清理**: 无

### 8. Settings Panel - Default Panel Selection
- **场景 A**: 选择 "Proj" → 回调传入 `default_panel: "Proj"`
- **场景 B**: 选择 "Diary" → 回调传入 `default_panel: "Diary"`
- **持久化**: 设置保存到 DB，mock 不持久化
- **清理**: 无

### 9. Settings Panel - Bubble Opacity / Size Slider
- **场景 A**: 拖动 opacity slider → 值正确更新
- **场景 B**: 拖动 size slider → 值正确更新
- **持久化**: 无
- **清理**: 无

### 10. Settings Panel - Import Data
- **场景 A**: 点击 import 按钮 → 调用 `dbImportFromPath`
- **场景 B**: 导入成功 → 显示成功消息
- **场景 C**: 导入失败 → 显示错误消息
- **持久化**: 导入操作会写 DB，测试 mock 不实际调用 Rust
- **清理**: 无

### 11. Tag Management in Settings
- **场景 A**: Fast tag checkbox toggle → `dbSetFastTag` 被调用
- **场景 B**: Color swatch 点击 → 颜色选择器弹出
- **场景 C**: Delete tag → `dbDeleteTag` 被调用
- **持久化**: 标签数据在 DB 中，mock 不实际修改
- **清理**: 无

### 12. PopupPanel - Panel Navigation
- **场景 A**: 点击 sidebar 按钮 → 切换 active panel
- **场景 B**: 点击 close 按钮 → 关闭 panel
- **场景 C**: `switch-panel` event → panel 切换
- **持久化**: 无
- **清理**: 无

### 13. CRUD Modals - Engine / Proj / Asset / Tool
- **场景 A (Add)**: 打开 modal → 填写表单 → 保存 → 验证数据
- **场景 B (Edit)**: 打开 modal → 修改 → 保存
- **场景 C (Delete)**: 点击 delete → 调用 `dbDelete*`
- **场景 D (Validation)**: 空 name + empty dir → 保存按钮 disabled
- **持久化**: 会增加/修改/删除数据库记录。需要清理。
- **清理**: 在 `afterEach` 中调用 `dbDelete*` 删除测试创建的数据，或在 mock 中不持久化

### 14. Proj/Asset/Tool - Star Toggle
- **场景 A**: 点击 star → star=true → `dbToggle*Star(true)` 被调用
- **场景 B**: 再次点击 → star=false → `dbToggle*Star(false)` 被调用
- **持久化**: 无 (mock 不持久化)
- **清理**: 无

### 15. Proj/Asset/Tool - Screenshot View Toggle
- **场景 A**: 点击 camera 按钮 → 切换到截图视图
- **场景 B**: 再次点击 → 切换回文本视图
- **持久化**: 无
- **清理**: 无

### 16. Search & Tag Filter
- **场景 A**: 输入搜索文字 → debounce 后调用 `dbSearch*`
- **场景 B**: 点击 tag filter → tagIds 加入搜索参数
- **场景 C**: 点击已选中 tag → 取消 filter
- **场景 D**: 清空搜索 → 回到列表模式 `dbList*`
- **持久化**: 无
- **清理**: 无

### 17. Pagination
- **场景 A**: 有 2+ 页 → 分页控件显示
- **场景 B**: 点击下一页 → 加载第二页
- **场景 C**: 搜索后分页重置为第 1 页
- **持久化**: 无
- **清理**: 无

### 18. Diary Panel
- **场景 A**: 创建新 diary → `dbAddDiary` 调用
- **场景 B**: 选择 diary → 加载 details
- **场景 C**: 点击 + Today → 创建今日记录
- **场景 D**: 编辑内容 → 保存 → `dbSaveDiaryDetail` 调用
- **场景 E**: 排序切换 → 日期顺序反转
- **持久化**: 会增加日记记录。需要清理。
- **清理**: 在 `afterEach` 中 `dbDeleteDiary` 删除测试创建的 diary

### 19. Engine Panel - Auto-detect Version
- **场景 A**: 输入 `.exe` 路径 → debounce 后调用 `detectEngineVersion`
- **场景 B**: 返回版本信息 → version & mainVersion 自动填入
- **持久化**: 无
- **清理**: 无

### 20. Proj Panel - Scan Projects
- **场景 A**: 点击 Scan → 打开扫描功能
- **场景 B**: 扫描结果展示
- **持久化**: 扫描会插入 DB 记录，需要清理
- **清理**: 清理扫描插入的项目记录

### 21. Proj Panel - Run with Engine
- **场景 A**: 有关联引擎 → 调用 `launchProject`
- **场景 B**: 无关联引擎 → Toast "No engine associated with this project"
- **持久化**: 无
- **清理**: 无

---

## 持久化 & 清理总结

| 测试 | 持久化 | 清理方法 |
|------|--------|---------|
| 1-12, 14-17, 19, 21 | 无 (mock 环境) | 无需清理 |
| 13. CRUD Modals | 数据库新增记录 | 测试删除创建的数据 |
| 18. Diary Panel | 数据库新增 diary | 测试删除创建的 diary |
| 20. Scan Projects | 数据库新增项目 | 测试删除扫描结果 |

由于所有测试运行在 **静态 HTML + mock invoke** 环境下（通过 `e2e/test-page.html` 模式扩展），实际的 Tauri invoke 不会被调用，因此**实际上没有持久化问题**。清理仅适用于如果我们在 mock 环境中维护了状态数组的情况。

---

## 文件结构

```
e2e/
├── wdio.conf.cjs              # 已有
├── bubble.test.cjs            # 已有 (Bubble viewport)
├── test-page.html             # 已有 (Bubble viewport 测试页)
├── shared/
│   ├── mock-tauri.js          # Mock @tauri-apps/api/core invoke
│   └── test-utils.js          # 通用工具函数
├── pages/
│   ├── engine.html            # Engine Panel 测试页 (含 mock)
│   ├── proj.html              # Proj Panel 测试页
│   ├── asset.html             # Asset Panel 测试页
│   ├── tool.html              # Tool Panel 测试页
│   ├── diary.html             # Diary Panel 测试页
│   └── settings.html          # Setting Panel 测试页
├── panel-navigation.html      # PopupPanel 导航测试页
├── path-normalization.html    # Path normalization 测试页
├── open-folder.html           # Open folder + toast 测试页
└── i18n.html                  # I18n 测试页
```

Mock 方式：在每个测试 HTML 中，在 `window.__TAURI_INTERNALS__` 上注入 mock `invoke` 方法，让前端组件在不启动 Tauri 的情况下也能正常工作。
