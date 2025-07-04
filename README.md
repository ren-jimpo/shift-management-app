要件定義書（シフト管理アプリ）
1. 概要
本プロジェクトでは、3店舗（京橋・天満・本町）に勤務する社員・アルバイトのシフト作成および管理を、Webアプリケーション上で効率化・汎用化することを目的とする。各店舗間の人的リソースの重複や配置過多・不足を防ぎつつ、簡単な操作で誰でも運用可能なシステムを構築する。

2. 対象ユーザー
店舗責任者（店長）
アルバイト・社員スタッフ

3. 前提条件
シフト管理は週単位または月単位で行う
各店舗ごとに曜日別・時間帯別の必要人数が異なる
Webブラウザベースでインストール不要

4. 機能要件
4.1 シフト作成・管理機能（店長）
カレンダーをクリックしてシフトを入力・編集
「シフトパターン（例：通し、ランチ等）」をテンプレートとして選択可能
スタッフ名を選択することで、該当スタッフのスケジュールを自動反映
店舗ごとに設定した必要人数と実人数をリアルタイムで比較表示（赤：不足／青：過剰）
「確定」操作後、勤務時間・残業時間・人件費概算を自動計算
4.2 スタッフ希望申請・参照機能（スタッフ）
スマホ／PCブラウザでログイン、操作可能(レスポンシブ)
自分のシフトがカレンダーに表示される
希望休申請が可能（店長に通知）
希望休は店長がワンクリックで承認・却下
シフトが確定すると、当日0:00に「今日のシフト」が自動プッシュ通知
4.3 欠員対応機能
急な欠勤が出た場合、「代打募集」ボタンで全スタッフへ一斉通知
出勤可能なスタッフは「参加」ボタンで即応答可
4.4 勤怠ルール管理
任意の勤怠ルール（例：週28時間超、7連勤）を設定可能
違反時に自動警告表示
4.5 店舗設定機能
各店舗ごとに曜日別・時間帯別の必要人数を設定
「回せる人（応援に行けるスタッフ）」を指定可能
「固定出勤（例：社長は毎週月曜ランチ）」の自動反映設定が可能
4.6 表示・視認性向上
シフト種別ごとに色分け表示（例：通し＝オレンジ、ランチ＝水色など）
4.7 認証機能およびユーザー属性
 ログイン／認証機能
本システムはIDおよびパスワードによるログイン認証を実装する。
ログイン後、ユーザー属性に応じて操作可能範囲を制御する。
将来的な多要素認証（SMS認証など）はスコープ外とするが、拡張可能性を意識して設計する。
 ユーザー属性と権限レベル
ユーザーは下記のいずれかの属性（ロール）を持つ：
店舗責任者：自店舗のシフト作成・編集・承認、希望休承認、スタッフ管理、代打通知発信
スタッフ・アルバイト：自分のシフト閲覧、希望休申請、代打応募
各ユーザーのロールは管理者により「スタッフ管理」画面で付与・変更可能。
ログイン後のUIや機能制御は、このロールに基づいて切り替わる。
 ユーザー情報項目
各ユーザーには以下の情報を保持する：
氏名
電話番号
所属店舗（複数可／応援可能性に対応）
スキルレベル（研修中／即戦力／ベテラン）
権限ロール（店長／スタッフ／本部管理者）
メモ（面談履歴、注意事項など）


5. シフト作成操作フロー（店長）
ブラウザでURLアクセスし、ログイン
「店舗設定」から各店舗の必要人数や回せる人を設定
「スタッフ管理」でスタッフ情報を登録
「シフトパターン」を登録（最大25件）
週表示または月表示を選び、空きマスをクリックしシフトを登録
全体の人数過不足を色で確認し、必要に応じて調整
シフトを「確定」して通知・計算を実行
<<<<<<< HEAD
# shift-management-app
=======
 more about Next.js, take a look at the following resources:

>>>>>>> 1e7fea7 (Initial commit)
