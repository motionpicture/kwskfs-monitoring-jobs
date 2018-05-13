<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# KWSKFS 監視ジョブアプリケーション

## Getting Started

### 開発方法

npmでパッケージをインストール。

```shell
npm install
```

* [npm](https://www.npmjs.com/)

typescriptをjavascriptにコンパイル。

```shell
npm run build
```

### Environment variables

| Name                                        | Required              | Value                    | Purpose                      |
|---------------------------------------------|-----------------------|--------------------------|------------------------------|
| `DEBUG`                                     | false                 | kwskfs-monitoring-jobs:* | Debug                        |
| `NPM_TOKEN`                                 | true                  |                          | NPM auth token               |
| `NODE_ENV`                                  | true                  |                          | environment name             |
| `MONGOLAB_URI`                              | true                  |                          | MongoDB connection URI       |
| `SENDGRID_API_KEY`                          | true                  |                          | SendGrid API Key             |
| `GMO_ENDPOINT`                              | true                  |                          | GMO API endpoint             |
| `KWSKFS_DEVELOPER_EMAIL`                    | true                  |                          | 開発者通知用メールアドレス                |
| `KWSKFS_DEVELOPER_LINE_NOTIFY_ACCESS_TOKEN` | true                  |                          | LINE Notifyでのレポート通知          |
| `AZURE_STORAGE_CONNECTION_STRING`           | true                  |                          | Save charts on azure storage |
| `CHART_EXPIRES_IN_MONTH`                    | true                  |                          | チャート表示有効期間(ヵ月)               |
| `KWSKFS_API_CLIENT_ID`                      | true                  |                          | KWSKFS APIクライアントID           |
| `KWSKFS_API_CLIENT_SECRET`                  | true                  |                          | KWSKFS APIクライアントシークレット       |
| `KWSKFS_API_AUTHORIZE_SERVER_DOMAIN`        | true                  |                          | KWSKFS API認可サーバードメイン         |
| `KWSKFS_API_ENDPOINT`                       | true                  |                          | KWSKFS APIエンドポイント            |
| `SCENARIO_REFRESH_TOKEN`                    | true                  |                          | シナリオで使用するユーザーのリフレッシュトークン     |
| `BACKLOG_API_KEY`                           | true                  |                          | バックログAPI key                 |
| `CONTINUOUS_SCENARIOS_STOPPED`              | true                  | 1 or 0                   | 継続的なシナリオを止めるかどうか             |
| `CONTINUOUS_SCENARIOS_INTERVAL_IN_SECONDS`  | true                  | 1 or 0                   | 継続的なシナリオのイインターバル             |
| `WEBSITE_NODE_DEFAULT_VERSION`              | only on Azure WebApps |                          | Node.js version              |

## tslint

コード品質チェックをtslintで行う。

* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)

`npm run check`でチェック実行。

## パッケージ脆弱性のチェック

* [nsp](https://www.npmjs.com/package/nsp)

## clean

`npm run clean`で不要なソース削除。

## テスト

`npm test`でテスト実行。

## ドキュメント

`npm run doc`でjsdocが作成されます。
