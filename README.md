# Requesty API サンプル

このリポジトリには、Requesty Router APIを使用するサンプルスクリプトが含まれています。Requesty Router APIを使うと、様々なAIモデル（OpenAI、Anthropic、DeepSeek、Groq、XAIなど）に単一のAPIを通じてアクセスできます。

## 前提条件

- Node.js（バージョン14以上推奨）
- Requestyのアカウントと[APIキー](https://app.requesty.ai/)

## セットアップ

1. リポジトリをクローンまたはダウンロード
2. 必要なパッケージをインストール

```bash
npm install
```

## 使用方法

### 通常のリクエスト

```bash
node js/requesty.js normal <モデル名> <YOUR_API_KEY>
```

### ストリーミングリクエスト

```bash
node js/requesty.js stream <モデル名> <YOUR_API_KEY>
```

### 例

```bash
# 通常のリクエスト（非ストリーミング）
node js/requesty.js normal openai/gpt-4.1-mini YOUR_API_KEY

# ストリーミングリクエスト
node js/requesty.js stream anthropic/claude-3-7-sonnet-20250219 YOUR_API_KEY
```

## サポートされているモデル

このサンプルでは以下のモデルがサポートされています：

- OpenAI: gpt-4.1-nano, gpt-4.1-mini, o4-mini:high, o4-mini, gpt-4.1, o3-2025-04-16
- XAI: grok-3-mini-beta:high, grok-3-mini-beta
- Groq: qwen-qwq-32b
- Anthropic: claude-3-5-haiku-20241022, claude-3-5-sonnet-20241022, claude-3-7-sonnet-20250219
- DeepSeek: deepseek-chat-v3-0324, deepseek-r1-distill-qwen-1.5b

他のモデルも使用可能です。完全なリストは[Requesty公式ドキュメント](https://docs.requesty.ai/)を参照してください。

## カスタマイズ

このスクリプトは基本的な例を示しています。実際のアプリケーションでは以下をカスタマイズできます：

- システムメッセージ
- ユーザープロンプト
- 温度（temperature）、トークン数などのパラメータ
- ストリーミング出力の処理方法

## ライセンス

MITライセンス

## 参考リンク

- [Requesty公式サイト](https://requesty.ai/)
- [API ドキュメント](https://docs.requesty.ai/api-reference/overview)
- [APIキー管理](https://app.requesty.ai/router) 