# Supabase 后续接入

本阶段不执行 SQL、不部署 Edge Function，也不把密钥放进前端。上版未审核的建表及语音代理草案已归档在 `src/legacy/`，不会出现在静态构建里，也不可直接部署。

当前只有 `src/services/supabase/` 的持久化适配接口。正式接入前须确定账户体系、内容编辑权限、邀请状态的服务端验证、媒体 Storage 策略与 RLS 测试，再根据当前 Supabase 文档创建迁移。公开前端仅可使用 publishable key；服务端密钥保存在受控环境。
