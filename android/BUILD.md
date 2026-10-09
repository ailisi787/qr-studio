# Android 打包说明

v1.0 的 APK 是用 Android SDK 命令行工具手工构建的（未使用 Gradle），步骤如下。
需要：Android SDK（含 build-tools、platform android-36）、JDK 17。

```bash
# 1. 先构建网页产物
cd <repo-root>
npm install && npm run build      # 产物在 dist-spa/

# 2. 准备目录结构
APPID=com.ailisi787.qrstudio
mkdir -p apkbuild/assets/www apkbuild/res apkbuild/src
cp -r dist-spa/* apkbuild/assets/www/
cp -r android/res/* apkbuild/res/
cp -r android/src/* apkbuild/src/
cp android/AndroidManifest.xml apkbuild/

# 3. 编译资源与代码
BT=$ANDROID_SDK/build-tools/36.0.0
$BT/aapt2 compile --dir apkbuild/res -o apkbuild/compiled_res.zip
$BT/aapt2 link -o apkbuild/base.apk \
  -I $ANDROID_SDK/platforms/android-36/android.jar \
  --manifest apkbuild/AndroidManifest.xml \
  --java apkbuild/gen \
  -A apkbuild/assets \
  apkbuild/compiled_res.zip \
  --min-sdk-version 24 --target-sdk-version 36 \
  --version-code 1 --version-name 1.0
javac -source 17 -target 17 \
  -cp $ANDROID_SDK/platforms/android-36/android.jar \
  -d apkbuild/classes \
  $(find apkbuild/src apkbuild/gen -name "*.java")
$BT/d8 --min-api 24 --output apkbuild/dex \
  $(find apkbuild/classes -name "*.class")

# 4. 组装、对齐、签名
cd apkbuild
cp base.apk unsigned.apk
zip -r unsigned.apk "dex/classes.dex"   # 放到包根目录改名为 classes.dex
$BT/zipalign -f 4 unsigned.apk aligned.apk
keytool -genkeypair -keystore debug.keystore -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass android -keypass android \
  -dname "CN=Android Debug,O=Android,C=US"
$BT/apksigner sign --ks debug.keystore --ks-pass pass:android \
  --key-pass pass:android --out qr-studio.apk aligned.apk
```

注意：

- `MainActivity` 里 `setAllowUniversalAccessFromFileURLs(true)` 是必需的，
  否则 WebView 加载本地 `file:///android_asset` 下的 ES module 会被跨域拦截导致白屏。
- 正式发布请换成自己的正式签名 keystore，versionCode 递增。
