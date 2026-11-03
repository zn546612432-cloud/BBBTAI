# 地图 App｜澳门真实底图 + 虚构剧情地点

状态：独立测试分支，不合入 main。地图 UI 使用本地打包的 Leaflet 1.9.4 (BSD-2-Clause) + 本地存储的 OpenStreetMap 矢量数据，运行时不请求在线地图瓦片。仅地图模块有改动。

## 数据与权限

- `data/places.js` 是稳定地点 ID 的展示目录，不替代 `src/story/story55/catalog.js` 的剧情源数据。
- `kind: 'real'` 是真实地区及展示锚点；`kind: 'fictional'` 是虚构地点，`lat/lng` **只用于地图视觉摆放**，不能作为真实导航地址或精确地理事实。
- `revealDay` 或 `revealNode` 控制地点何时出现在地图和搜索结果。隐藏地点不允许通过搜索或未解锁 deep link 提前透露。
- `storyLocationId` 是与既有故事目录对应的 ID，非独立的节点完成信号。**点击地点不自动完成任务**。
- D30 `/place?id=uk`（实际参数通过路由对象传入）与世界地图切换保留旧逻辑：玩家仍通过“关联文件位置”推进剧情。
- 玩家存档、已有节点日期、开发者剧情编辑器均不迁移、不清空。

例子：

```js
{
 id: 'base', name: '废弃大屋', kind: 'fictional',
 area: 'MACAU', lat: 22.2021, lng: 113.5374,
 revealNode: 'move', storyLocationId: 'base',
 description: '地图位置为剧情示意。'
}
```

## 跨 App 联动接口

已有 `PhoneRouter.open` 接受 `{appId,route,params}`，地图现在支持：

```js
import {mapPlaceLink} from '../maps/data/places.js';
router.open(mapPlaceLink('changning'));
router.open({appId:'maps',route:'/',params:{id:'orphanage'}});
```

在微信/Kira/Ghost 中可以把“查看地图”按钮或消息地址链接指向上述对象；**暂未主动修改其他 App 的消息点击事件**。需要同时检查对应剧情解锁条件，尤其不要让未解锁的标记在文本内容中泄漏。

原有故事任务入口依然使用 `{appId:'maps',route:'/place',params:{id:'uk'}}`，不能机械替换成 `route:'/'`。

## 后续开发者编辑器

建议新建 `developer/features/map-places/`，以 `id` 为主键保存 `displayAnchor, aliases, photo, revealDay/revealNode, description, sourceApp`。用户编辑只覆盖展示目录字段；对已存在的 `story55.config.locations` 要维护明确映射，**不要覆盖原有 x/y 和 node 任务配置**。编辑经纬度必须标注“虚构显示位置”，增加恢复默认按钮。

## 渲染与部署约束

- GitHub Pages 无后端也可显示完整澳门道路、建筑、水域等地图数据，Leaflet JS/CSS 存放在 public/vendor/leaflet/，底图位于 src/apps/maps/data/offline-macau-detail.js。地图组件没有地图服务/API/CDN请求。站点首次打开仍需要联网获取游戏页面代码，若要让整部手机游戏断网冷启动，需要另行设计全站缓存或安装包。
- 真实地点和虚构地点采用两类标记。虚构地点的弹窗明确标注“非真实地址，不提供导航”。
- 动态消息/日历更新不应该重建 Leaflet 实例；自定义元素只通过 `data-visible` 更新标记列表。DOM 视图被真正移除时注销地图和 ResizeObserver。
- OSM 标注不可删除；遵守瓦片服务使用政策，不做批量下载；Leaflet 已自托管。禁止预下载 OSM 官方在线瓦片；几何数据来自开放 Geofabrik Macau extract，须显示 © OpenStreetMap contributors / ODbL。
- 地图手势与系统左右滑动、手机上滑解锁须在真实 iPhone 测试。

## 验收范围

1. D01 仅显示真实地区、昌宁公寓和旧孤儿院；废弃大屋与金辉资金中心未解锁。
2. D12 完成 `move` 节点后出现“废弃大屋”，在搜索中也能找到。
3. D41 完成 `show` 节点后出现“金辉资金中心”。
4. 点击虚构地点不会触发剧情状态变化；弹窗不提供伪造的导航距离。
5. `/place` 旧入口（英国线索）仍可操作“关联文件位置”，世界/澳门切换不丢内容。
6. 地图返回再进入，保留缩放/中心；消息更新不应使地图闪白。
7. GitHub Pages 子路径和在浏览器打开的 URL 符合构建规则。

## 已实现的澳门离线数据构建和测试

- 直接读取 Geofabrik Macau 的合法矢量数据 ZIP（不是地图图片），由 `scripts/build-offline-macau.py` 处理 OSM 道路、建筑、水域、绿地、铁路等图层，输出 `data/offline-macau-detail.js`。
- `data/offline-macau.js` 保留不依赖在线数据的基础澳门行政区轮廓、轻轨和东望洋赛道。
- `.github/workflows/offline-macau.yml` 仅对 `feat/leaflet-apple-maps-preview-1103` 生效，将约 4 MB 的离线地图模块写回该分支；不会部署或更改 main。
- `scripts/build-offline-macau-preview.py` 将离线底图、Leaflet、CSS 合成单一 `preview/ximeng-macau-offline.html` 文件，无需网络、API key、瓦片服务器即可双指缩放、拖动和搜索测试标记。它是独立地图预览，不带微信或游戏存档。
- GitHub Actions 自动运行 map test、JavaScript syntax checks 及完整 `npm run build:pages`，再发布预览 HTML 的 Actions artifact。
- **离线范围说明**：独立 HTML 下载到本地后可以断网打开；在线 GitHub Pages 网站若从未打开过，其整个入口页面不保证断网加载。地图应用只要已加载，缩放、拖动和搜索全程不联网。
