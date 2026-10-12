# Lark Base Connector Demo

最小数据连接器插件：配置页只显示一行“连接器插件 Demo”，同时实现 Base 连接器所需的最小协议。

## 接口

- `GET /`：配置页
- `GET /meta.json`：连接器元信息
- `POST /api/table_meta`：返回一个文本字段
- `POST /api/records`：返回一条 Demo 记录

## 本地运行

```bash
npm test
npm start
```

默认监听 `http://localhost:3000`。

## 部署环境变量

```bash
PUBLIC_BASE_URL=https://your-domain.example \
VERIFICATION_TOKEN=your-verification-token \
npm start
```

- `PUBLIC_BASE_URL`：公网 HTTPS 基址，用于生成 `dataSourceConfigUiUri`
- `VERIFICATION_TOKEN`：可选；设置后校验 Base 请求签名
- 服务入口：`server.js`
- Node.js：`>=16`
