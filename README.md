# 码印 · QR Studio

输入网址或文本，实时生成可自定义颜色、尺寸与纠错等级的二维码，并导出 PNG。

## 功能

- 输入网址 / 文本实时生成二维码
- 纠错等级：L / M / Q / H
- 前景 / 背景色自定义 + 配色方案
- 导出尺寸 128–1024px
- 低对比度提示
- 设置保存在本机

## 下载安装（Android）

直接下载安装包（v1.0，约 327KB，Android 7.0+）：

👉 [qr-studio-v1.0.apk](https://github.com/ailisi787/qr-studio/releases/download/v1.0/qr-studio-v1.0.apk)

也可以在 [Releases](https://github.com/ailisi787/qr-studio/releases) 页面下载。

安装时如提示"未知来源"，允许本次安装即可（测试签名包）。

## 网页版本地运行

```bash
npm install
npm run dev      # 开发预览
npm run build    # 构建，产物在 dist-spa/
```

构建产物为纯静态文件，可直接用任何静态服务器托管。

## Android 壳说明

`android/` 下是极简原生 WebView 壳源码（`MainActivity.java` + `AndroidManifest.xml` +
资源），把构建产物放进 `assets/www/` 即可打包。打包步骤见
[android/BUILD.md](android/BUILD.md)。

## 技术栈

React 19 · Tailwind CSS v4 · qrcode · Vite
