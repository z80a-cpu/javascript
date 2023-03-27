/**
 * brokanoid ブロカノイド
 * host: (any)
 *
 * キー操作
 *
 * URLパラメタ
 *  s: ステージ
 *  i: tick間隔 初期値: 9
 */
(function() {
  // 通し番号
  let BALL_NUM  = 0;
  let BLOCK_NUM = 0;
  let ITEM_NUM  = 0;

  // ボール直径
  const BALL_SIZE = 12;

  // ブロック幅・高さ
  const BLOCK_WIDTH  = 30;
  const BLOCK_HEIGHT = 15;

  // デフォルトtick間隔(ms)
  const INTERVAL = 9;

  // スピード
  const BASE_SPEED = 3;
  const MIN_SPEED  = 2;
  const MAX_SPEED  = 4;
  const UNIT_SPEED = 1; // 増減単位

  // アイテムドロップ確率(母数)
  const DROP_RATIO = 13;

  // バー反射
  const BAR_EDGE   =  7; // 同角度反射範囲(%)
  const BAR_BOUND  = 20; // 切込反射範囲(%)
  const BAR_BANGLE =  7; // 切込角度
  const BAR_LANGLE = 30; // 限界角度(%、tilt限界共通)

  // バーの色
  const BAR_COLOR = {
    'NORMAL': 0,
    'BOUND' : 1,
    'EDGE'  : 2,
  };

  // バー底からの高さ(px)
  const BAR_FOM_BOTTOM = 80;

  // 操作可能残り割合
  const REMAINING = 0.1;

  // ブロック定数
  const BLOCK_DEF = {
    'IRON'     :  0, // 非破壊
    'BLUE'     :  1,
    'ORANGE'   :  2,
    'GREEN'    :  3,
    'RED'      :  4,
    'PINK'     :  5,
    'KHAKI'    :  6,
    'SPEEDUP'  :  7, // スピードアップ
    'SPLIT'    :  8, // 分裂
    'RAINBOW'  :  9, // 貫通
    'UPWARD'   : 10, // 上方向一方通行
    'DOWNWARD' : 11, // 下方向一方通行
    'BARRIER'  : 99, // バリア
  };

  // ブロック色
  const BLOCK_COLORS = [
    // 非破壊
    '#696969', // 0: DimGray
    // 破壊(1回)
    '#87CEFA', // 1: LightSkyBlue
    '#FFA500', // 2: Orange
    '#32CD32', // 3: LimeGreen
    '#FF4500', // 4: OrangeRed
    '#FF69B4', // 5: HotPink
    '#BDB76B', // 6: DarkKhaki
  ];

  // アイテム定数
  const ITEM_DEF = {
    'SPEEDUP'   : 0, // スピードアップ
    'SPEEDDOWN' : 1, // スピードダウン
    'WIDE'      : 2, // バーワイド
    'BARRIER'   : 3, // バリア
    'SPLIT'     : 4, // 分裂
  };

  // アイテムドロップ確率(%)
  const ITEM_DROP_RATIO = {
    0 : 20, // スピードアップ
    1 : 32, // スピードダウン
    2 : 25, // バーワイド
    3 : 20, // バリア
    4 :  3, // 分裂
  };

  // バリア色
  const BARRIER_COLORS = [
    '#FF3927',
    '#FF7A49',
    '#FFC0A9',
  ];

  // バー拡張倍率
  const BAR_WIDE = [
    1.3,
    1.6,
    2.0,
  ];

  // ボール定数
  const BALL_DEF = {
    'NORMAL'  : 0,
    'RAINBOW' : 1,
  };

  const STAGES = {
     0 : 'ランダム',
     1 : '格子',
     2 : '縦縞',
     3 : '楕円',
     4 : 'フェンス',
     5 : '素数',
     6 : '通路',
     7 : '三角',
     8 : '波',
     9 : '上下上',
    10 : '横縞',
    11 : 'ビール',
    12 : 'スリーピース',
    13 : '円',
    14 : '二重',
    15 : 'ハンバーガー',
    16 : '迷路',
  };

  /**
   * セットアップクラス
   */
  class Setup
  {
    // ブラウザ幅・高さ
    #cw;
    #ch;

    constructor(cw, ch)
    {
      this.#cw = cw;
      this.#ch = ch;
    }

    /**
     * URLパラメタセット
     */
    static initParams()
    {
      let params = {};

      // URLパラメタセット
      const pairs = location.search.substring(1).split('&');
      let args = [];
      pairs.forEach(element => {
        const kv = element.split('=');
        args[kv[0]] = kv[1];
      });

      // ステージ
      if ('s' in args) {
        params['s'] = parseInt(args['s']);
      }

      // 間隔
      if ('i' in args) {
        params['i'] = parseInt(args['i']);
      }

      return params;
    }

    /**
     * 初期処理
     */
    static init()
    {
      let html = '';

      // 全画面オーバーレイ
      html = '<style type="text/css">'
           + '.fulloverlay {'
           + '  position: absolute;'
           + '  left: 0; top: 0;'
           + '  width: 100%; height: 100%;'
           + '  background: rgba(0, 0, 0, 0);'
           + '  z-index: 20000;'
           + '}'
           + '</style>'
           + '<div class="fulloverlay">'
           + '</div>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // 情報モーダル
      html = '<style type="text/css">'
           + '.info-area-window {'
           + '  position:fixed;'
           + '  top:0;'
           + '  left:0;'
           + '  display:flex;'
           + '  justify-content:flex-start;'
           + '  align-items:start;'
           + '  width:100vw;'
           + '  height:100vh;'
           + '  background-color:rgba(0, 0, 0, 0.7);'
           + '  backdrop-filter:blur(5px);'
           + '  z-index:10000;'
           + '}'
           + '.info-area-window .content {'
           + '  border-radius: 4px;'
           + '  position:relative;'
           + '  box-sizing:border-box;'
           + '  margin:5px;'
           + '  padding:3px;'
           + '  color:#090815;'
           + '  background-color:#706D6D;'
           + '  text-align:right;'
           + '  font-family:sans-serif;'
           + '}'
           + '.info-area-window .content .remaining {'
           + '  color:#FF0033;'
           + '  font-weight:bold'
           + '}'
           + '</style>'
           + '<div class="info-area-window" id="info-area" aria-hidden="true">'
           + '  <div class="content">'
           + '    RB:<span id="clear-blocks">0</span>'
           + '  </div>'
           + '</div>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ステージセレクトモーダル
      const host = location.origin + location.pathname;
      html = '<style type="text/css">'
           + '.stage-modal {'
           + '  width:100vw;'
           + '  height:100vh;'
           + '  position:fixed;'
           + '  inset:0;'
           + '  margin:auto;'
           + '  display:flex;'
           + '  visibility:hidden;'
           + '  align-items: center;'
           + '  justify-content:center;'
           + '  z-index:20001;'
           + '}'
           + '.stage-modal .content {'
           + '  border-radius:4px;'
           + '  position:relative;'
           + '  box-sizing:border-box;'
           + '  margin:5px;'
           + '  padding:5px;'
           + '  color:#161426;'
           + '  background-color:#FFFFFF;'
           + '  text-align:center;'
           + '  font-family:sans-serif;'
           + '}'
           + '.stage-modal .content .header {'
           + '  margin:5px;'
           + '  font-size: 1.3em;'
           + '  font-weight:bold'
           + '}'
           + '.stage-modal .content .stage {'
           + '  display: flex;'
           + '  justify-content: center;'
           + '  flex-wrap: wrap;'
           + '}'
           + '.stage>div {'
           + '  width: 49%;'
           + '  box-sizing: border-box;'
           + '  border: 1px solid #808080;'
           + '  margin: 1px;'
           + '  padding: 3px;'
           + '  border-radius:4px;'
           + '}'
           + '.stage-link>a {'
           + '  display: block;'
           + '  text-decoration: none;'
           + '  padding: 7px;'
           + '  color: #411445;'
           + '}'
           + '.stage-link>a:visited {'
           + '  color: #411445;'
           + '  background: #FAEBD7;'
           + '}'
           + '.stage-link>a:hover {'
           + '  color: #411445;'
          //  + '  font-weight: bold;'
           + '}'
           + '.stage>div:hover {'
           + '  background: #A7CAA9;'
           + '}'
           + '</style>'
           + '<div class="stage-modal" id="stage-modal" aria-hidden="true">'
           + '  <div class="content">'
           + '    <div class="header">ステージ選択</div>'
           + '    <div class="stage">';
      for (let i = 1; i < Object.keys(STAGES).length; i++) {
        html += '      <div class="stage-link">'
              + '        <a href="' + host + '?s=' + i + '">' + i + '.' + STAGES[i] + '</a>'
              + '      </div>';
      }
      html += '      <div class="stage-link">'
           + '        <a href="' + host + '?s=0">0.' + STAGES[0] + '</a>'
           + '      </div>'
           + '    </div>'
           + '  </div>'
           + '</div>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // 結果モーダル
      html = '<style type="text/css">'
           + '.result-modal {'
           + '  width:100vw;'
           + '  height:100vh;'
           + '  position:fixed;'
           + '  inset:0;'
           + '  margin:auto;'
           + '  display:flex;'
           + '  visibility:hidden;'
           + '  align-items: center;'
           + '  justify-content:center;'
           + '  z-index:20001;'
           + '}'
           + '.result-modal .content {'
           + '  border-radius:4px;'
           + '  position:relative;'
           + '  box-sizing:border-box;'
           + '  margin:5px;'
           + '  padding:5px;'
           + '  color:#161426;'
           + '  background-color:#FFFFFF;'
           + '  text-align:center;'
           + '  font-family:sans-serif;'
           + '}'
           + '.result-modal .content .header {'
           + '  margin:5px;'
           + '  font-size: 1.5em;'
           + '  font-weight:bold'
           + '}'
           + '.result-modal .content .message {'
           + '  font-weight: bold;'
           + '  color: #8B0000;'
           + '}'
           + '.result-modal .content td.ttl {'
           + '  text-align:left;'
           + '  padding-right:10px;'
           + '}'
           + '.result-modal .content td.cl {'
           + '  color:#484443;'
           + '  padding-left:15px;'
           + '}'
           + '.result-modal .content td.cntt {'
           + '  text-align:right;'
           + '}'
           + '.stage-select {'
           + '  margin: 10px;'
           + '}'
           + '.stage-select>a {'
           + '  color: #ffffff;'
           + '  background-color: #eb6100;'
           + '  border-radius: 4px;'
           + '  text-decoration: none;'
           + '  padding: 5px;'
           + '}'
           + '.stage-select>a:hover {'
           + '  color: #ffffff;'
           + '  background: #CD774F;'
           + '}'
           + '.stage-retry {'
           + '  margin: 10px;'
           + '}'
           + '.stage-retry>a {'
           + '  color: #ffffff;'
           + '  background-color: #006400;'
           + '  border-radius: 4px;'
           + '  text-decoration: none;'
           + '  padding: 5px;'
           + '}'
           + '.stage-retry>a:hover {'
           + '  color: #ffffff;'
           + '  background: #2E8B57;'
           + '}'
           + '</style>'
           + '<div class="result-modal" id="result-modal" aria-hidden="true">'
           + '  <div class="content">'
           + '    <div class="header">brokanoid</div>'
           + '    <div class="message" id="message"></div>'
           + '    <div class="stage-retry" id="stage-retry" style="display:none">'
           + '      <a href="' + location.href + '">リトライ</a>'
           + '    </div>'
           + '    <table border="0">'
           + '      <tr>'
           + '        <td class="ttl">ステージ</td>'
           + '        <td class="cntt" id="bstage"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">画面サイズ(px)</td>'
           + '        <td class="cntt" id="bscreen">100x50</td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">経過時間</td>'
           + '        <td class="cntt" id="belapsed"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">クリアブロック</td>'
           + '        <td class="cntt" id="bclear"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">クリア率</td>'
           + '        <td class="cntt" id="bratio"></td>'
           + '      </tr>'
           + '    </table>'

           + '    <div class="stage-select">'
           + '      <a href="' + host + '">ステージ選択</a>'
           + '    </div>'

           + '  </div>'
           + '</div>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // 球SVG
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgball" viewbox="0 0 16 16">'
           + '<g>'
           + '<circle cx="8" cy="8" r="8" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // バーSVG
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgbar" viewbox="0 0 32 8" preserveAspectRatio="none">'
           + '<g>'
           + '<rect x="0" y="0" width="32" height="8" rx="3" ry="3" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgblock" viewbox="0 0 32 16" preserveAspectRatio="none">'
           + '<g>'
           + '<rect x="0" y="0" width="31" height="15" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG スピードアップ
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgblockspeed" viewbox="0 0 32 16" preserveAspectRatio="none">'
           + '<g>'
           + '<rect x="0" y="0" width="31" height="15" fill="#1E90FF" />'
           + '<path d="M 15 2 L 24 13 L 6 13 z" fill="#AFEEEE" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG 分裂
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgblocksplit" viewbox="0 0 32 16" preserveAspectRatio="none">'
           + '<g>'
           + '<rect x="0" y="0" width="31" height="15" fill="#b49e46" />'
           + '<circle cx="23" cy="8" r="3" fill="#ebe5cf" />'
           + '<circle cx="9" cy="8" r="3" fill="#ebe5cf" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG 貫通
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:hidden;">'
           + '<defs>'
           + '<linearGradient id="gradient" gradientUnits="userSpaceOnUse"x1="0" y1="0" x2="31" y2="15">'
           + '<stop offset="0.14" stop-color="#ff0000"/>'
           + '<stop offset="0.28" stop-color="#ffa500"/>'
           + '<stop offset="0.42" stop-color="#ffff00"/>'
           + '<stop offset="0.56" stop-color="#008000"/>'
           + '<stop offset="0.70" stop-color="#00ffff"/>'
           + '<stop offset="0.84" stop-color="#0000ff"/>'
           + '<stop offset="1.00" stop-color="#800080"/>'
           + '</linearGradient>'
           + '<symbol id="orgblockrainbow" viewbox="0 0 32 16" preserveAspectRatio="none">'
           + '<g fill="url(#gradient)">'
           + '<rect x="0" y="0" width="31" height="15" />'
           + '</g>'
           + '</symbol>'
           + '</defs>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG 上方向一方通行
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgblockupward" viewbox="0 0 32 16" preserveAspectRatio="none">'
           + '<g>'
           + '<rect x="0" y="0" width="31" height="15" stroke="#778899" />'
           + '<path d="M 15 2 L 24 13 L 6 13 z" stroke="#778899" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG 下方向一方通行
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgblockdownfard" viewbox="0 0 32 16" preserveAspectRatio="none">'
           + '<g>'
           + '<rect x="0" y="0" width="31" height="15" stroke="#778899" />'
           + '<path d="M 15 13 L 6 2 L 24 2 z" stroke="#778899" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // アイテムSVG 0 スピードアップ
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgitemup" viewbox="0 0 32 32" preserveAspectRatio="none">'
           + '<g>'
           + '<circle cx="16" cy="16" r="15" fill="#1E90FF" />'
           + '<text x="16" y="27" font-size="28" text-anchor="middle" fill="#FFFFE0" font-weight="bold">U</text>'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // アイテムSVG 1 スピードダウン
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgitemdown" viewbox="0 0 32 32" preserveAspectRatio="none">'
           + '<g>'
           + '<circle cx="16" cy="16" r="15" fill="#483d8b" />'
           + '<text x="16" y="26" font-size="27" text-anchor="middle" fill="#B0E0E6" font-weight="bold">D</text>'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // アイテムSVG 2 バーワイド
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgitemwide" viewbox="0 0 32 32" preserveAspectRatio="none">'
           + '<g>'
           + '<circle cx="16" cy="16" r="15" fill="#2E8B57" />'
           + '<text x="16" y="26" font-size="25" text-anchor="middle" fill="#ADFF2F" font-weight="bold">W</text>'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // アイテムSVG 3 バリア
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgitembarrier" viewbox="0 0 32 32" preserveAspectRatio="none">'
           + '<g>'
           + '<circle cx="16" cy="16" r="15" fill="#fd0102" />'
           + '<text x="16" y="26" font-size="27" text-anchor="middle" fill="#FFFFE0" font-weight="bold">B</text>'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // アイテムSVG 4 分裂
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgitemsplit" viewbox="0 0 32 32" preserveAspectRatio="none">'
           + '<g>'
           + '<circle cx="16" cy="16" r="15" fill="#b49e46" />'
           + '<text x="16" y="26" font-size="27" text-anchor="middle" fill="#FFFFE0" font-weight="bold">S</text>'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);
    }
  }

  /**
   * ゲームクラス
   */
  class Game
  {
    // ブラウザ幅・高さ
    #cw;
    #ch;

    // ブロック数
    #cntW;
    #cntH;

    // 残りブロック数
    #rBlocks = 0;

    // パラメタ
    #params;

    constructor()
    {
      // ブラウザ幅・高さ
      this.#cw = document.documentElement.clientWidth;
      this.#ch = document.documentElement.clientHeight;
      // ブロック数
      this.#cntW =  Math.floor((this.#cw / BLOCK_WIDTH));
      this.#cntH =  Math.floor((this.#ch / BLOCK_HEIGHT));
      // console.log('ブラウザ', this.#cw, this.#ch, this.#cntW, this.#cntH);

      // パラメタ
      this.#params = Setup.initParams();

      // 初期設定
      Setup.init(this.#cw, this.#ch);

      this.startTime = new Date();
    }

    /**
     * ゲームの開始処理
     */
    start()
    {
      if (this.#params['s'] === undefined) {
        // ステージセレクトモーダル表示
        const stageModal = document.getElementById('stage-modal');
        stageModal.style.visibility = 'visible';

      } else {
        console.log('*** ゲームスタート ***');

        // フィールド初期化
        this.field = new Field(this.#cw, this.#ch);

        // ステージ生成
        this.stage();

        // バー生成
        this.field.bar = new Bar(this.#cw, this.#ch);

        // ボール生成
        this.field.balls.push(new Ball(this.field.bar.x + this.field.bar.w / 2, this.field.bar.cy - this.field.bar.h));

        // キーボードイベントの登録
        this.setKeyEvent();

        // マウスイベントの登録
        this.setMouseEvent();

        // タッチイベント登録
        this.setTouchEvent();

        // tick
        const intvl = this.#params['i'] === undefined ? INTERVAL : this.#params['i'];
        this.timer = setInterval(() => this.tick(), intvl);
      }
    }

    /**
     * ステージ初期化
     */
    stage()
    {
      // ステージセレクト
      switch (this.#params['s']) {
        case 0:
          this.stageRandom();
          break;
        case 1:
          // 格子
          this.stageLattice();
          break;
        case 2:
          // 縦縞
          this.stageVerticalStripe();
          break;
        case 3:
          // 楕円
          this.stageEllipse();
          break;
        case 4:
          // フェンス
          this.stageFence();
          break;
        case 5:
          // 素数
          this.stagePrimeNumber();
          break;
        case 6:
          // 通路
          this.stagePassage();
          break;
        case 7:
          // 三角
          this.stageTriangle();
          break;
        case 8:
          // 波
          this.stageSineWave();
          break;

        case 9:
          // 上下上
          this.stageUpDown();
          break;
        case 10:
          // 横縞
          this.stageHorizontalStripe();
          break;
        case 11:
          // ビール
          this.stageBeer();
          break;
        case 12:
          // スリーピース
          this.stageThreePieces();
          break;
        case 13:
          // 円
          this.stageCircle();
          break;
        case 14:
          // 二重
          this.stageDoubleFence();
          break;
        case 15:
          // ハンバーガー
          this.stageHamburger();
          break;
        case 16:
          // 迷路
          this.stageMaze();
          break;
      }

      // クリア対象ブロック数
      this.#rBlocks = this.field.blocks.filter(block => block.type !== BLOCK_DEF['IRON']).length;
    }

    /**
     * ステージ: ランダム
     */
    stageRandom()
    {
      // ブロック割合(%)
      const blockRatio = {
        'NONE'     : 20.7, // なし
        'IRON'     :  3,
        'RANDOM'   : 72, // 破壊可能ブロックランダム
        'SPEEDUP'  :  1,
        'SPLIT'    :  1,
        'RAINBOW'  :  0.3,
        'UPWARD'   :  1,
        'DOWNWARD' :  1,
      };
      const sx = 0; // 開始x
      const sy = 3; // 開始y
      let w = this.#cntW - sx + 1; // 幅
      let h = Math.floor(this.#cntH * 0.6) - sy; // 高さ

      // ブロック配列初期化
      let tblocks = [];
      for (let y = 0; y <= h; y++) {
        let r = [];
        for (let x = 0; x < w; x++) {
          r.push(null);
        }
        tblocks.push(r);
      }

      // ブロック種類決定
      for (let y = sy; y < h; y++) {
        for (let x = sx; x < w; x++) {
          let type = null;

          if (x === w - 1) {
            // 右端 非破壊ブロック
            type = BLOCK_DEF['IRON'];
          } else {
            const rnd = Math.random() * 100;
            let total = 0;
            for (const [btype, ratio] of Object.entries(blockRatio)) {
              if (total <= rnd && rnd < total + ratio) {
                if (btype === 'NONE') {
                  // なし
                  type = null;
                } else if (btype === 'RANDOM') {
                  // 破壊可能ブロックランダム
                  type = Math.floor(Math.random() * 6) + 1;
                } else {
                  type = BLOCK_DEF[btype];
                }
                break;
              }
              total += ratio;
            }
          }

          tblocks[y][x] = type;
        }
      }

      // 縦方向
      if (Math.random() * 100 < 70) {
        // x方向位置
        const px = Math.floor((w / 3) * (Math.floor(Math.random() * 2) + 1));
        // 幅
        const bw = 3;

        // ブロック種別(0:NONE, 1:UPWARD, 2:DOWNWARD)
        let bt = Math.floor(Math.random() * 3);

        for (let y = sy; y < h; y++) {
          // x相対座標
          for (let x = 0; x < bw; x++) {
            let type = null;
            if ((bt === 1 || bt === 2) && y % 4 === 0) {
              if (bt === 1) {
                type = BLOCK_DEF['UPWARD'];
              } else if (bt === 2) {
                type = BLOCK_DEF['DOWNWARD'];
              }
            }
            tblocks[y][px + x] = type;
          }
        }
      }

      // 描写
      for (let y = sy; y < h; y++) {
        for (let x = sx; x < w; x++) {
          if (tblocks[y][x] !== null) {
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, tblocks[y][x], BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
    }

    /**
     * ステージ: 格子
     */
    stageLattice()
    {
      const sx = Math.floor(this.#cntW * 0.2);
      const sy = Math.floor(this.#cntH * 0.2);
      let w = Math.floor(this.#cntW * 0.6);
      let h = Math.floor(this.#cntH * 0.3);
      w = w % 2 === 0 ? w : w - 1;
      h = h % 2 === 0 ? h : h - 1;

      for (let y = 0; y <= h; y++) {
        for (let x = 0; x <= w; x++) {
          if (x % 2 === 0 && y % 2 === 0) {
            continue;
          }

          const type = Math.floor(Math.random() * 6) + 1;
          this.field.blocks.push(new Block((sx + x) * BLOCK_WIDTH, (sy + y) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }
    }

    /**
     * ステージ: 楕円
     */
    stageEllipse()
    {
      // 縦横半径
      const rx = Math.floor(this.#cntW * 0.4);
      const ry = Math.floor(this.#cntH * 0.2);
      // 中心座標
      const cx = Math.floor(this.#cntW * 0.5);
      const cy = Math.floor(this.#cntH * 0.3);

      for (let y = 0; y < this.#cntH; y++) {
        for (let x = 0; x < this.#cntW; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
            const type = (y === cy && x % 2 === 0 && Math.abs(dx) !== rx) ? BLOCK_DEF['SPLIT'] : y % 6 + 1;
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
    }

    /**
     * ステージ: 3ピース
     */
    stageThreePieces()
    {
      for (let y = Math.floor(this.#cntH * 0.1); y < Math.floor(this.#cntH * 0.6); y+=4) {
        for (let x = Math.floor(this.#cntW * 0.1); x < Math.floor(this.#cntW * 0.9); x+=4) {
          for (let iy = y; iy < y + 3; iy++) {
            let type = iy % 6 + 1;
            if (iy === y && Math.random() * 12 < 1) {
              type = BLOCK_DEF['IRON'];
            }
            for (let ix = x; ix < x + 3 && ix < this.#cntW; ix++) {
              this.field.blocks.push(new Block(ix * BLOCK_WIDTH, iy * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
            }
          }
        }
      }
    }

    /**
     * ステージ: 三角
     */
    stageTriangle()
    {
      const side =  Math.floor(this.#cntH * 0.1);
      let tc = 0;

      for (let y = 3; y < Math.floor(this.#cntH * 0.5); y += side + 1) {
        for (let x = 1; x < this.#cntW; x += side + 1) {
          let type = tc % 6 + 1;
          tc++;
          if (Math.random() * 100 < 7) {
            type = BLOCK_DEF['IRON'];
          }

          const iflag = Math.random() * 100 < 8;
          for (let iy = 0; iy <  side; iy++) {
            for (let ix = 0; ix < iy + 1 && x + ix < this.#cntW; ix++) {
              let etype = type;
              if (type !== BLOCK_DEF['IRON'] && ix === 1 && iy === 2 && iflag) {
                // スピードアップ～下方向一方通行
                etype = Math.floor(Math.random() * 5) + 7;
              }
              this.field.blocks.push(new Block((x + ix) * BLOCK_WIDTH, (y + iy) * BLOCK_HEIGHT, etype, BLOCK_WIDTH, BLOCK_HEIGHT));
            }
          }
        }
      }
    }

    /**
     * ステージ: ビール
     */
    stageBeer()
    {
      for (let y = 5; y < Math.floor(this.#cntH * 0.7); y++) {
        for (let x = 2; x < this.#cntW - 5; x++) {
          if (x === 2 || x === this.#cntW - 6 || y === Math.floor(this.#cntH * 0.7) - 1) {
            // カップ
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, BLOCK_DEF['IRON'], BLOCK_WIDTH, BLOCK_HEIGHT));

          } else if (y === 7) {
            // 下方向一方通行
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, BLOCK_DEF['DOWNWARD'], BLOCK_WIDTH, BLOCK_HEIGHT));

          } else if (y === 8 || y === 9) {
            // 泡
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, BLOCK_DEF['SPLIT'], BLOCK_WIDTH, BLOCK_HEIGHT));

          } else if (y >= 10) {
            const type = (x + y) % 2 ? BLOCK_DEF['ORANGE'] : BLOCK_DEF['KHAKI'];
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
      // 取っ手
      for (let y = Math.floor(this.#cntH * 0.2); y < Math.floor(this.#cntH * 0.5); y++) {
        for (let x = this.#cntW - 5; x < this.#cntW - 3; x++) {
          if (x === this.#cntW - 4 | y === Math.floor(this.#cntH * 0.2) || y === Math.floor(this.#cntH * 0.5) - 1) {
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, BLOCK_DEF['IRON'], BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
    }

    /**
     * ステージ: 縦縞
     */
    stageVerticalStripe()
    {
      // 縦
      for (let y = 5; y < Math.floor(this.#cntH * 0.6); y++) {
        for (let x = 0; x < this.#cntW; x += 2) {
          const type = ((x / 2) % 5) + 1; // 破壊ブロック1-5
          this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }

      // 横
      let spup = Math.floor(this.#cntW * 0.5);
      for (let x = 1; x < this.#cntW; x += 2) {
        const rnd = Math.random() * 100;
        let type = BLOCK_DEF['KHAKI'];
        if (rnd < 3) {
          // 3%
          type = BLOCK_DEF['RAINBOW'];
        } else if (rnd < 10) {
          // 7%
          type = BLOCK_DEF['SPLIT'];
        } else if (rnd < 15) {
          // 5%
          type = BLOCK_DEF['SPEEDUP'];
        }
        this.field.blocks.push(new Block(x * BLOCK_WIDTH, Math.floor(this.#cntH * 0.3) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
      }
    }

    /**
     * ステージ: 横縞
     */
    stageHorizontalStripe()
    {
      for (let y = 5; y < Math.floor(this.#cntH * 0.5); y += 3) {
        for (let x = 0; x < this.#cntW; x++) {
          let type = Math.floor(((y / 2) % 6)) + 1; // 破壊ブロック
          if (x % Math.floor(this.#cntW / 4) === 0) {
            const rnd = Math.random() * 100;
            if (rnd < 3) {
              // 3%
              type = BLOCK_DEF['RAINBOW'];
            } else if (rnd < 10) {
              // 7%
              type = BLOCK_DEF['SPLIT'];
            } else if (rnd < 15) {
              // 5%
              type = BLOCK_DEF['SPEEDUP'];
            } else {
              continue;
            }
          }
          this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }
    }

    /**
     * ステージ: フェンス
     */
    stageFence()
    {
      // 囲い
      let x = Math.floor(this.#cntW * 0.8);
      for (let y = 0; y < Math.floor(this.#cntH * 0.6); y++) {
        if ((Math.floor(this.#cntH * 0.2) <= y && y <= Math.floor(this.#cntH * 0.2) + 1) || (Math.floor(this.#cntH * 0.4) <= y && y <= Math.floor(this.#cntH * 0.4) + 1)) {
          continue;
        }
        this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, BLOCK_DEF['IRON'], BLOCK_WIDTH, BLOCK_HEIGHT));
      }
      for (let x = 0; x <= Math.floor(this.#cntW * 0.8); x++) {
        const y = Math.floor(this.#cntH * 0.6);
        this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, BLOCK_DEF['IRON'], BLOCK_WIDTH, BLOCK_HEIGHT));
      }

      // 内側ブロック楕円
      // 縦横半径
      const rx = Math.floor(this.#cntW * 0.3);
      const ry = Math.floor(this.#cntH * 0.2);
      // 中心座標
      const cx = Math.floor(this.#cntW * 0.4) - 2;
      const cy = Math.floor(this.#cntH * 0.3);

      for (let y = 0; y < Math.floor(this.#cntH * 0.6); y++) {
        for (let x = 0; x < Math.floor(this.#cntW * 0.8); x++) {
          const dx = x - cx;
          const dy = y - cy;
          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
            let type = y === cy ? BLOCK_DEF['SPLIT'] : y % 6 + 1;
            type = x === Math.floor(this.#cntW * 0.4) - 2 ? BLOCK_DEF['SPEEDUP'] : type;
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
    }

    /**
     * ステージ: 円
     */
    stageCircle()
    {
      const r  = 4; // 半径
      let   tc = 0;

      for (let y = 2; y <= Math.floor(this.#cntH * 0.5); y += r * 2 + 1) {
        for (let x = 0; x < this.#cntW; x += r * 2 + 1) {
          tc++;

          // 円
          for (let iy = 0; iy < r * 2; iy++) {
            for (let ix = 0; ix < r * 2 && x + ix < this.#cntW ; ix++) {
              const dx = ix - r;
              const dy = iy - r;
              if ((dx * dx) / (r * r) + (dy * dy) / (r * r) <= 1) {
                let type = tc % 6 + 1;
                if (ix === r && iy === r) {
                  const rd = Math.random() * 100;
                  if (rd < 3) { // 3%
                    type = BLOCK_DEF['RAINBOW'];
                  } else if (rd < 23) { // 20%
                    type = BLOCK_DEF['IRON'];
                  } else if (rd < 33) { // 10%
                    type = BLOCK_DEF['SPLIT'];
                  } else if (rd < 43) { // 10%
                    type = BLOCK_DEF['SPEEDUP'];
                  } else {  // 57%
                    continue;
                  }
                }
                this.field.blocks.push(new Block((x + ix) * BLOCK_WIDTH, (y + iy) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
              }
            }
          }
        }
      }
    }

    /**
     * ステージ: 正弦波
     */
    stageSineWave()
    {
      let qr = Math.PI / 2; // ラジアン90度

      for (let x = 0; x < this.#cntW; x++) {
        let y = 10 * Math.sin(x * ((Math.PI * 2) / 16));
        y = Math.floor(this.#cntH * 0.35 + y);

        // 6ブロック重ねる
        for (let i = 0; i < 6; i++) {
          // Y座標0より上
          if (y - i < 0) {
            continue;
          }

          // 破壊ブロック
          let type = i + 1;

          // 180度ごとに特殊ブロック
          if (x * ((Math.PI * 2) / 16) >= qr && i === 5) {
            qr += Math.PI; // 次

            const rd = Math.random() * 100;
            if (rd < 5) { // 5%
              type = BLOCK_DEF['RAINBOW'];
            } else if (rd < 45) { // 40%
              type = BLOCK_DEF['SPLIT'];
            } else { // 55%
              type = BLOCK_DEF['SPEEDUP'];
            }
          }

          this.field.blocks.push(new Block(x * BLOCK_WIDTH, (y - i) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }
    }

    /**
     * ステージ: 2重
     */
    stageDoubleFence()
    {
      let fw = Math.floor(this.#cntW * 0.8);
      let fh = Math.floor(this.#cntH * 0.5);
      let bx = Math.floor(this.#cntW * 0.5) - Math.floor(fw / 2);
      let by = 3;
      let tc = Math.floor(Math.random() * 6);

      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          fw -= 4;
          fh -= 4;
          bx += 2;
          by += 2;
        }

        tc++;

        for (let x = 0; x < fw; x++) {
          for (let y = 1; y < fh; y++) {
            if (x === 0 || x === fw - 1 || y === 1 || y === fh - 1 || i === 2) {
              if (i === 2 && (x + y) % 2 === 0) {
                continue;
              } else if (i === 2) {
                tc++;
              }

              let type = tc % 6 + 1;

              // 2枚目の下壁
              if ((i === 1 && y === fh - 1 && 0 < x && x < fw - 1 && x % 2 === 0)) {
                type = BLOCK_DEF['UPWARD'];
              }

              this.field.blocks.push(new Block((bx + x) * BLOCK_WIDTH, (by + y) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
            }
          }
        }
      }
    }

    /**
     * ステージ: 素数
     */
    stagePrimeNumber()
    {
      let tc = Math.floor(Math.random() * 6);

      for (let y = 0; y < Math.floor(this.#cntH * 0.5); y++) {
        for (let x = 0; x < Math.floor(this.#cntW); x++) {
          let prime = true;
          const target = y * this.#cntW + x + 1;

          // 素数判定
          if (target === 1) {
            prime = false;
          } else {
            for (let i = 2; i < target; i++) {
              if (target % i === 0) {
                prime = false;
                break;
              }
            }
          }

          if (prime) {
            tc++;
            const type = tc % 6 + 1;
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, (y + 3) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));

          } else if (Math.random() * 100 < 1) {
            const type = BLOCK_DEF['IRON'];
            this.field.blocks.push(new Block(x * BLOCK_WIDTH, (y + 3) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
    }

    /**
     * ステージ: 通路
     */
    stagePassage()
    {
      const ph = Math.floor(this.#cntH * 0.5 / 3); // 通路高さ
      let pass = []; // 通路y座標
      let type;

      // 通路
      for (let i = 0; i < 3; i++) {
        const y = Math.floor(this.#cntH * 0.5) - i * ph;
        pass.push(y);
        for (let x = 0; x < this.#cntW; x++) {
          if (i === 2 && x < 2) {
            // 上区切り:左2ブロック
            type = BLOCK_DEF['DOWNWARD'];

          } else if (i === 2 && x > this.#cntW - 3) {
            // 上区切り:右2ブロック
            type = BLOCK_DEF['UPWARD'];
          } else if (i === 0 && x > this.#cntW - 4) {
            // 下区切り:右3ブロック
            type = Math.floor(Math.random() * 6) + 1;
          } else if (i === 1 && x < 2) {
            // 中区切り:左2ブロック
            type = BLOCK_DEF['SPLIT'];
          } else {
            type = BLOCK_DEF['IRON'];
          }
          this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }
      // 中区切りだけ右端1ブロック増やす
      this.field.blocks.push(new Block(this.#cntW * BLOCK_WIDTH, (Math.floor(this.#cntH * 0.5) - 1 * ph) * BLOCK_HEIGHT, BLOCK_DEF['IRON'], BLOCK_WIDTH, BLOCK_HEIGHT));

      // 通路中心
      let x = Math.floor(this.#cntW * 0.5);
      for (let y = Math.floor(this.#cntH * 0.5) - 2 * ph; y < Math.floor(this.#cntH * 0.5); y++) {
        // 壁部分スキップ
        if (pass.includes(y)) {
          continue;
        }
        type = Math.floor(Math.random() * 6) + 1;
        this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
      }

      // 上3x3
      const uh = Math.floor(this.#cntH * 0.5) - 2 * ph;
      for (let ry = 0; ry < 3; ry++) {
        let y = Math.floor(uh * 0.5) - 1 + ry;
        if (y >= uh) {
          continue;
        }
        for (let rx = 0; rx < 3; rx++) {
          let x = Math.floor(this.#cntW * 0.5) - 1 + rx;
          type = Math.floor(Math.random() * 6) + 1;
          this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }
    }

    /**
     * ステージ: ハンバーガー
     */
    stageHamburger()
    {
      let type;
      const sx = Math.floor(this.#cntW * 0.2);
      const ex = Math.floor(this.#cntW * 0.8);
      const sy = 5;
      const ey = Math.floor(this.#cntH * 0.5);

      const size = ey - sy - 2;
      let tc = 0;

      for (let y = sy; y <= ey; y++) {
        // 横幅が奇数のとき肉部分の色の調整のため
        tc = (ex - sx) % 2 === 1 ? tc + 1 : tc;

        for (let x = sx; x <= ex; x++) {
          if (y === sy || y === ey) {
            // 外側
            if (y === sy || x <= sx + 1 || ex - 1 <= x) {
              continue;
            }
            type = BLOCK_DEF['IRON'];
          } else if (y <= sy + Math.floor(size * 0.2) || (ey - Math.floor(size * 0.2) <= y && y <= ey - 1)) {
            if ((sy + 1 === y || ey - 1 === y) && (x <= sx + 1 || ex - 1 <= x) ) {
              continue;
            } if (sy + 2 === y && x % 3 === 1) {
              // ゴマ
              type = BLOCK_DEF['SPLIT'];
            } else {
              // パン
              type = BLOCK_DEF['KHAKI'];
            }
          } else if (y <= sy + Math.floor(size * 0.3) || (ey - Math.floor(size * 0.3) <= y && y < ey - Math.floor(size * 0.2))) {
            // レタス
            type = BLOCK_DEF['GREEN'];
          } else if (y <= sy + Math.floor(size * 0.35) || (ey - Math.floor(size * 0.35) <= y && y < ey - Math.floor(size * 0.3))) {
            // ケチャップ
            type = BLOCK_DEF['RED'];
          } else {
            tc++;
            if ((y === sy + Math.floor(size * 0.35) + 1) && (x === sx + Math.floor(this.#cntW * 0.2) || x === sx + Math.floor(this.#cntW * 0.4))) {
              // ピクルス
              type = BLOCK_DEF['RAINBOW'];
            } else {
              // 肉
              type = tc % 2 === 0 ? BLOCK_DEF['ORANGE'] : BLOCK_DEF['PINK'];
            }
          }

          this.field.blocks.push(new Block(x * BLOCK_WIDTH, y * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
        }
      }
    }

    /**
     * ステージ: 迷路
     */
    stageMaze()
    {
      const sx = 1; // 開始x座標
      const sy = 4; // 開始y座標
      let w = this.#cntW - sx; // 迷路幅
      let h = Math.floor(this.#cntH * 0.6) - sy; // 迷路高さ
      // 奇数にする(0始まりなので偶数)
      w = w % 2 === 0 ? w : w - 1;
      h = h % 2 === 0 ? h : h - 1;

      // 迷路配列初期化
      let maze = [];
      for (let y = 0; y <= h; y++) {
        let r = [];
        for (let x = 0; x <= w + 1; x++) {
          r.push(null);
        }
        maze.push(r);
      }

      // 外周と柱設置
      for (let y = 0; y <= h; y++) {
        for (let x = 0; x <= w + 1; x++) {
          if (y === 0 && ((x % 10 === 1 && x < w) || x === w - 1)) {
            // 最上部:抜け

          } else if (y === h && ((x % 6 === 1 && x < w) || x === w - 1)) {
            // 最下部:一方通行
            maze[y][x] = BLOCK_DEF['UPWARD'];

          } else if (y === 0 || y === h || x === 0 || x >= w) {
            // 外周
            maze[y][x] = BLOCK_DEF['IRON'];
          } else if (y % 2 === 0 && x % 2 === 0) {
            // 柱
            maze[y][x] = BLOCK_DEF['IRON'];
          }
        }
      }

      // 柱の周りにIRONブロックを置く
      for (let y = 2; y < h; y += 2) {
        for (let x = 2; x < w; x += 2) {
          while (true) {
            let rnd;
            if (x === 2) {
              // 1列目
              rnd = Math.floor(Math.random() * 4);
            } else {
              // 2列目以後
              rnd = Math.floor(Math.random() * 3);
            }

            let mx, my;
            if (rnd === 0) {
              // 上
              mx = x;
              my = y - 1;
            } else if (rnd === 1) {
              // 右
              mx = x + 1;
              my = y;
            } else if (rnd === 2) {
              // 下
              mx = x;
              my = y + 1;
            } else if (rnd === 3) {
              // 左
              mx = x - 1;
              my = y;
            }

            // IRONブロックが存在しない場合のみ設置
            if (maze[my][mx] === null) {
              maze[my][mx] = BLOCK_DEF['IRON'];
              break;
            }
          }
        }
      }

      // 少し柱を減らす
      for (let y = 2; y < h; y += 2) {
        for (let x = 1; x < w; x += 2) {
          if (Math.random() * 10 < 3) {
            maze[y][x] = null;
          }
        }
      }
      for (let y = 1; y < h; y += 2) {
        for (let x = 2; x < w; x += 2) {
          if (Math.random() * 10 < 1) {
            maze[y][x] = null;
          }
        }
      }

      // アイテム設置
      for (let y = 1; y <= h; y++) {
        for (let x = 1; x <= w + 1; x++) {
          if (maze[y][x] === null) {
            const rnd = Math.random() * 100;
            if (rnd < 0.5) { // 0.5%
              maze[y][x] = BLOCK_DEF['RAINBOW'];
            } else if (rnd < 3.5) { // 3%
              maze[y][x] = BLOCK_DEF['SPLIT'];
            } else if (rnd < 4.5) { // 1%
              maze[y][x] = BLOCK_DEF['SPEEDUP'];
            } else if (rnd < 19.5) { // 15%
              maze[y][x] = Math.floor(Math.random() * 6) + 1;
            }
          }
        }
      }

      // 迷路描写
      for (let y = 0; y <= h; y++) {
        for (let x = 0; x <= w + 1; x++) {
          if (maze[y][x] !== null) {
            this.field.blocks.push(new Block((sx + x) * BLOCK_WIDTH, (sy + y) * BLOCK_HEIGHT, maze[y][x], BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }

      // 最下部左 下一方通行
      this.field.blocks.push(new Block(0 * BLOCK_WIDTH, (sy + h) * BLOCK_HEIGHT, BLOCK_DEF['DOWNWARD'], BLOCK_WIDTH, BLOCK_HEIGHT));
    }

    /**
     * ステージ: 上下上
     */
    stageUpDown()
    {
      const owW = Math.floor(Math.random() * 2) + 3; // 一方通行幅
      const owI = 5; // 間隔
      const sx = 0;
      const ex = this.#cntW;
      const sy = 4;
      const ey = Math.floor(this.#cntH * 0.5);
      const cx = Math.floor((ex - sx) / 2 - owW / 2); // 中心

      for (let y = 0; y <= ey - sy; y++) {
        for (let x = 0; x <= ex; x++) {
          // 左右 上一方通行
          if (((0 <= x && x < 0 + owW) || (ex - owW < x && x <= ex)) && y % owI === 0) {
            const type = BLOCK_DEF['UPWARD'];
            this.field.blocks.push(new Block((sx + x) * BLOCK_WIDTH, (sy + y) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }

          // 中 下一方通行
          if (cx <= x && x < cx + owW && y % owI === 0) {
            const type = BLOCK_DEF['DOWNWARD'];
            this.field.blocks.push(new Block((sx + x) * BLOCK_WIDTH, (sy + y) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }

          // 破壊ブロック
          if (((0 + owW <= x && x < cx) || (cx + owW <= x && x <= ex - owW))) {
            let type = null;

            // 分裂or貫通
            if (x === owW + Math.floor((cx - owW) * 0.5) && y === Math.floor((ey - sy) * 0.4)) {
              type = BLOCK_DEF['SPLIT'];
            } else if (x === cx + owW + Math.floor((ex - owW - cx - owW) * 0.5) && y === Math.floor((ey - sy) * 0.4)) {
              type = BLOCK_DEF['RAINBOW'];
            }

            // 少し抜けを作る
            if (type === null && Math.random() * 13 < 1) {
              continue;
            }

            if (type === null) {
              type = Math.floor(Math.random() * 6) + 1;
            }

            this.field.blocks.push(new Block((sx + x) * BLOCK_WIDTH, (sy + y) * BLOCK_HEIGHT, type, BLOCK_WIDTH, BLOCK_HEIGHT));
          }
        }
      }
    }

    /**
     * 単位時間処理
     */
    tick()
    {
      // ボール当たり判定＆移動
      this.field.balls.forEach(ball => {
        [ball.exist, ball.angle, ball.x, ball.y, ball.speed, ball.type] = this.field.collide(ball);
        ball.draw();
      });

      // ボールオブジェクト削除
      this.field.balls = this.field.balls.filter(function(ball) {
        if (!ball.exist) {
          // SVG削除
          ball.remove();
        }
        return ball.exist;
      });

      // クリア対象残りブロック数
      const br = this.field.blocks.filter(function (block) {
        return block.type !== BLOCK_DEF['IRON']
            && block.type !== BLOCK_DEF['BARRIER']
            && block.type !== BLOCK_DEF['UPWARD']
            && block.type !== BLOCK_DEF['DOWNWARD']
      }).length;

      // 残りブロック
      const clearBlock = document.getElementById('clear-blocks');
      clearBlock.textContent  = br.toLocaleString();

      // 残りブロックn割以下で情報モーダルの色を変える
      if (br / this.#rBlocks <= REMAINING) {
        clearBlock.classList.add("remaining");
      }

      if (br <= 0) {
        // クリア
        this.gameOver(true, false);
      }

      // ゲームオーバー
      if (this.field.balls.length <= 0) {
        this.gameOver(false, false);
      }

      // アイテム当たり判定＆移動
      this.field.items.forEach(item => {
        [item.exist, item.y] = this.field.collideItem(item);
        item.draw();
      });

      // アイテムオブジェクト削除
      this.field.items = this.field.items.filter(function(item) {
        if (!item.exist) {
          // SVG削除
          item.remove();
        }
        return item.exist;
      });
    }

    /**
     * 終了処理
     */
    gameOver(clear = true, giveup = false)
    {
      clearInterval(this.timer);

      if (giveup) {
        console.log('*** ギブアップ ***');
      } else if (clear) {
        console.log('*** クリア ***');
      } else {
        console.log('*** ゲームオーバー ***');
      }

      // 経過時間
      const endTime = new Date();
      const datet   = parseInt((endTime.getTime() - this.startTime.getTime()) / 1000);
      const hour    = parseInt(datet / 3600);
      const min     = parseInt((datet / 60) % 60);
      const sec     = datet % 60;
      const elapsed = hour + ':' + ('00' + min).slice(-2) + ':' + ('00' + sec).slice(-2);

      // 画面
      const bscreen = this.#cw   + 'x' + this.#ch;

      // ブロック数
      const bt     = this.#rBlocks; // 総クリア対象ブロック数
      // 残りクリア対象ブロック数
      const br = this.field.blocks.filter(function (block) {
        return block.type !== BLOCK_DEF['IRON']
            && block.type !== BLOCK_DEF['BARRIER']
            && block.type !== BLOCK_DEF['UPWARD']
            && block.type !== BLOCK_DEF['DOWNWARD']
      }).length;
      // クリアブロック数
      const bc = bt - br;
      const bclear = bc.toLocaleString() + '/' + bt.toLocaleString();
      // クリア率
      const bratio = Math.floor((bc / bt) * 100) + '%';

      console.log('ステージ:' + this.#params['s'] + '.' + STAGES[this.#params['s']]);
      console.log('経過時間:' + elapsed);
      console.log('クリアブロック:' + bclear);
      console.log('クリア率:' + bratio + '%');

      // ステージ
      const bstage = this.#params['s'] + '.' + STAGES[this.#params['s']];

      document.getElementById('bscreen').textContent  = bscreen;
      document.getElementById('belapsed').textContent = elapsed;
      document.getElementById('bclear').textContent   = bclear;
      document.getElementById('bstage').textContent   = bstage;
      document.getElementById('bratio').textContent   = bratio;

      // 終了メッセージ
      const massage = document.getElementById('message');
      if (clear) {
        massage.textContent = 'クリア！';
      } else if (giveup) {
        massage.textContent = 'ギブアップ';
        document.getElementById('stage-retry').style.display = 'inline-block';
      } else if (clear === false && giveup === false) {
        massage.textContent = '失敗';
        document.getElementById('stage-retry').style.display = 'inline-block';
      }

      // 結果モーダル表示
      const resultModal = document.getElementById('result-modal');
      resultModal.style.visibility = 'visible';
    }

    /**
     * キーイベント
     */
    setKeyEvent()
    {
      document.onkeydown = function(e) {
        switch(e.keyCode)
        {
          case 37: // 左
            this.field.bar.move(-1);
            break;
          case 39: // 右
            this.field.bar.move(1);
            break;
          case 71: // G
            this.gameOver(false, true);
            break;
          case 84: // T
            this.tilt();
            break;
          case 85: // U
            this.speedup();
            break;
        };
      }.bind(this);
    }

    /**
     * ティルト
     */
    tilt()
    {
      console.log('Tilt!');

      // ボール別にランダムに5度傾ける
      this.field.balls.forEach(ball => {
        let angle = ball.angle;
        // 90度ごとに傾ける範囲を決定(基準+-BAR_LANGLE)
        const base = Math.floor(angle / 90) * 90;
        const from = base + BAR_LANGLE;
        const to   = base + 90 - BAR_LANGLE;
        // ランダムプラマイ3-5度
        const ta = Math.floor(Math.random() * 3) + 3;
        let tilt = Math.floor(Math.random() * 2) < 1 ? ta * -1 : ta;
        tilt = angle + tilt < from ? tilt * -1 : tilt;
        tilt = angle + tilt > to   ? tilt * -1 : tilt;
        ball.angle = angle + tilt;
        // console.log('tilt! ' + tilt + '度', angle, ball.angle);
      });
    }

    /**
     * スピードアップ
     */
    speedup()
    {
      this.field.balls.forEach(ball => {
        if (ball.speed < MAX_SPEED) {
          ball.speed += UNIT_SPEED;
        }
      });
      console.log('スピードアップ(手動)');
    }

    /**
     * マウスイベント
     */
    setMouseEvent()
    {
      // バー左右移動
      document.body.addEventListener('mousemove', e => {
        const x = e.pageX;
        this.field.bar.moveDirect(x);
      }, false);

      // ボタン押下
      document.body.addEventListener('mousedown', e => {
        // 残りn割以下ならば反転可能
        const br = this.field.blocks.filter(function (block) {
          return block.type !== BLOCK_DEF['IRON']
              && block.type !== BLOCK_DEF['BARRIER']
              && block.type !== BLOCK_DEF['UPWARD']
              && block.type !== BLOCK_DEF['DOWNWARD']
        }).length;

        if (br / this.#rBlocks <= REMAINING) {
          // 反転
          this.field.balls.forEach(ball => {
            ball.reverse();
            ball.draw();
          });
        }
      }, false);
    }

    /**
     * タッチイベント
     */
    setTouchEvent()
    {
      // バー左右移動
      document.body.addEventListener('touchmove', e => {
        const touchList = e.changedTouches;
        for (let i = 0; i < touchList.length ; i++ ) {
          const cx = touchList[i].clientX;
          this.field.bar.moveDirect(cx);
        }
      }, false);

      // ギブアップ
      document.body.addEventListener('touchstart', e => {
        const touchList = e.changedTouches;
        for (let i = 0; i < touchList.length ; i++) {
          const cx = touchList[i].clientX;
          const cy = touchList[i].clientY;
          if (cx < this.#cw * 0.2 && cy < this.#ch * 0.1) {
            this.gameOver(false, true);
          }
        }
      }, false);
    }
  }

  /**
   * ブロッククラス
   */
  class Block
  {
    constructor(x, y, type, w, h, cntBr = 0)
    {
      this.x = x;
      this.y = y;
      this.type = type;
      this.w = w;
      this.h = h;

      // 耐久度
      if (this.type == BLOCK_DEF['IRON'] || this.type == BLOCK_DEF['UPWARD'] || this.type == BLOCK_DEF['DOWNWARD']) {
        // 非破壊ブロック
        this.durability = -1;
      } else {
        this.durability = 1;
      }

      // 存在フラグ
      this.exist = true;

      // 中心座標
      this.cx = this.x + this.w / 2;
      this.cy = this.y + this.h / 2;

      // ID(10桁連番)
      BLOCK_NUM++;
      BLOCK_NUM = BLOCK_NUM > 9999999999 ? 1 : BLOCK_NUM;
      this.id = ('0000000000' + BLOCK_NUM).slice(-10);

      // SVGタグ生成
      if (this.type < 7) {
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002; fill: ' + BLOCK_COLORS[this.type] + ';'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblock"></use>'
          + '</svg>'
        );
      } else if (this.type === BLOCK_DEF['SPEEDUP']) {
        // スピードアップ
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002;'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblockspeed"></use>'
          + '</svg>'
        );
      } else if (this.type === BLOCK_DEF['SPLIT']) {
        // 分裂
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002;'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblocksplit"></use>'
          + '</svg>'
        );
      } else if (this.type === BLOCK_DEF['RAINBOW']) {
        // 貫通
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002;'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblockrainbow"></use>'
          + '</svg>'
        );

      } else if (this.type === BLOCK_DEF['BARRIER']) {
        // バリア
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002; fill: ' + BARRIER_COLORS[cntBr] + ';'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblock"></use>'
          + '</svg>'
        );

      } else if (this.type === BLOCK_DEF['UPWARD']) {
        // 上方向一方通行
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002;'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblockupward"></use>'
          + '</svg>'
        );

      } else if (this.type === BLOCK_DEF['DOWNWARD']) {
        // 下方向一方通行
        document.querySelector('body').insertAdjacentHTML('beforeend',
            '<svg id="block-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
          + ' style="width: ' + w + 'px; height: ' + h + 'px;'
          + ' opacity: 1; position: fixed; z-index: 10002;'
          + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
          + ' display: inline-block;">'
          + '<use xlink:href="#orgblockdownfard"></use>'
          + '</svg>'
        );
      }
      this.svg = document.getElementById('block-' + this.id);
    }

    /**
     * SVG削除(インスタンス削除前に実行)
     */
    remove()
    {
      this.svg.remove();
    }
  }

  /**
   * ボールクラス
   */
  class Ball
  {
    // 貫通色
    #rainbow = [
      '#ff0000',
      '#ffa500',
      '#ffff00',
      // '#008000',
      '#00ffff',
      '#0000ff',
      '#800080',
    ];
    // 貫通弾のための色替えカウンタ
    #rn = 0;

    constructor(x, y, angle = 315, type = 0)
    {
      // ID(10桁連番)
      BALL_NUM++;
      BALL_NUM = BALL_NUM > 9999999999 ? 1 : BALL_NUM;
      this.id = ('0000000000' + BALL_NUM).slice(-10);

      // SVGタグ生成(実際の描写前)
      document.querySelector('body').insertAdjacentHTML('beforeend',
          '<svg id="ball-' + this.id + '" viewBox="0 0 ' + BALL_SIZE + ' ' + BALL_SIZE + '"'
        + ' style="width: ' + BALL_SIZE + 'px; height: ' + BALL_SIZE + 'px;'
        + ' opacity: 1; position: fixed; z-index: 10002;'
        + ' display: none;">'
        + '<use xlink:href="#orgball"></use>'
        + '</svg>'
      );
      this.svg = document.getElementById('ball-' + this.id);

      this.exist = true;
      this.type = type;

      // 色
      this.svg.style.fill = '#FFFFFF';

      // 初期座標(ボールの中心)
      this.x = x;
      this.y = y;

      // 鉄球
      this.iron = false;

      // 角度
      this.angle = angle;

      // スピード
      this.speed = BASE_SPEED;
    }

    /**
     * 移動
     */
    move()
    {
      this.x += this.speed * Math.cos(this.angle * (Math.PI / 180));
      this.y += this.speed * Math.sin(this.angle * (Math.PI / 180));
    }

    /**
     * 反転
     */
    reverse()
    {
      if (0 <= this.angle && this.angle < 90) {
        this.angle = 360 - (this.angle - 0);

      } else if (90 <= this.angle && this.angle < 180) {
        this.angle = 270 - (this.angle - 90);

      } else if (180 <= this.angle && this.angle < 270) {
        this.angle = 180 - (this.angle - 180);

      } else if (270 <= this.angle && this.angle < 360) {
        this.angle = 0 + (this.angle - 270);
      }
    }

    /**
     * 描画
     */
    draw()
    {
      // 虹色
      if (this.type === 1) {
        this.#rn = this.#rn < this.#rainbow.length ? this.#rn + 1 : 0;
        this.svg.style.fill = this.#rainbow[this.#rn];
      }

      // ボールの中心から左上に座標変換
      const sx = Math.floor(this.x - BALL_SIZE / 2);
      const sy = Math.floor(this.y - BALL_SIZE / 2);
      this.svg.style.left = sx + 'px';
      this.svg.style.top  = sy + 'px';
      // console.log('draw: angle, x, y', this.angle, sx, sy);

      if (this.svg.style.display == 'none') {
        this.svg.style.display = 'inline-block';
      }
    }

    /**
     * SVG削除(インスタンス削除前に実行)
     */
    remove()
    {
      this.svg.remove();
    }
  }

  /**
   * バークラス
   */
  class Bar
  {
    // ブラウザ幅・高さ
    #cw;
    #ch;

    constructor(cw, ch, w = null, h = 10)
    {
      // ブラウザ幅・高さ
      this.#cw = cw;
      this.#ch = ch;

      // バー幅・高さ
      this.w = w === null ? Math.floor(this.#cw / 10) : w;
      this.w = this.w < 70 ? 70 : this.w;
      this.w = this.w > 130 ? 130 : this.w;
      this.ow = this.w; // 元の幅
      this.h = h;

      // 拡張倍率
      this.mag = 1;

      // 初期位置
      this.x = this.#cw / 2 - this.w / 2;
      this.y = this.#ch - BAR_FOM_BOTTOM;

      // 中心
      this.center();

      // SVGタグ生成
      document.querySelector('body').insertAdjacentHTML('beforeend',
          '<svg id="bar" viewBox="0 0 ' + this.w + ' ' + this.h + '"'
        + ' style="width: ' + this.w + 'px; height: ' + this.h + 'px;'
        + ' opacity: 1; position: fixed; z-index: 10002;'
        + ' left: ' + Math.floor(this.x) + 'px; top: ' + Math.floor(this.y) + 'px;'
        + ' display: inline-block;" preserveAspectRatio="none">'
        + '<use xlink:href="#orgbar"></use>'
        + '</svg>'
      );
      this.svg = document.getElementById('bar');

      // 色
      this.setColor(BAR_COLOR['NORMAL']);
      // this.svg.style.fill = '#DCDCDC';
    }

    /**
     * 色セット
     */
    setColor(state = BAR_COLOR['NORMAL'])
    {
      let color;
      switch (state) {
        case BAR_COLOR['NORMAL']:
          // 通常
          color = '#DCDCDC';
          break;
        case BAR_COLOR['BOUND']:
          // バー端
          color = '#e8a7ca';
          break;
        case BAR_COLOR['EDGE']:
          // バー先端
          color = '#ff3366';
          break;
      }
      this.svg.style.fill = color;
    }

    /**
     * 移動
     */
    move(dx)
    {
      this.setColor(BAR_COLOR['NORMAL']);

      let x = this.x + dx * Math.floor(this.w / 2);
      x = x < 0 ? this.#cw - this.w : x;
      x = x >= this.#cw - (this.w / 2) ? 0 : x;
      this.x = x;
      this.center();

      this.svg.style.left = x;
    }

    /**
     * ダイレクト移動
     */
    moveDirect(x)
    {
      this.setColor(BAR_COLOR['NORMAL']);

      x = Math.floor(x - this.w / 2);
      x = x < x - this.w ? x - this.w : x;
      x = x >= this.#cw ? this.#cw : x;
      this.x = x;
      this.center();

      this.svg.style.left = this.x;
    }

    /**
     * 中心
     */
    center()
    {
      this.cx = this.x + this.w / 2;
      this.cy = this.y + this.h / 2;
    }

    /**
     * バー延長縮小
     */
    wide(mag)
    {
      this.mag = mag;
      this.w   = this.ow * mag;

      let x = this.x;
      if (x < this.w / 2) {
        // 拡大時、左端
        x = 0;
      } else if (this.#cw - this.w < x) {
        // 拡大時、右端
        x = this.#cw - this.w;
      } else {
        x = this.cx - this.w / 2;
      }
      this.x = x;
      this.svg.style.width = this.w;
      this.svg.style.left  = this.x;
      this.center();
    }
  }

  /**
   * アイテムクラス
   */
  class Item
  {
    constructor(x, y, type, w, h)
    {
      this.x = x;
      this.y = y;
      this.type = parseInt(type);
      this.w = w;
      this.h = h;

      this.speed = 1;

      // 存在フラグ
      this.exist = true;

      // 中心座標
      this.center();

      // ID(10桁連番)
      ITEM_NUM++;
      ITEM_NUM = ITEM_NUM > 9999999999 ? 1 : ITEM_NUM;
      this.id = ('0000000000' + ITEM_NUM).slice(-10);

      // SVGタグ生成
      let org;
      switch (this.type) {
        case ITEM_DEF['SPEEDUP']:
          org = 'orgitemup';
          break;
        case ITEM_DEF['SPEEDDOWN']:
          org = 'orgitemdown';
          break;
        case ITEM_DEF['WIDE']:
          org = 'orgitemwide';
          break;
        case ITEM_DEF['BARRIER']:
          org = 'orgitembarrier';
          break;
        case ITEM_DEF['SPLIT']:
          org = 'orgitemsplit';
          break;
      }
      document.querySelector('body').insertAdjacentHTML('beforeend',
          '<svg id="item-' + this.id + '" viewBox="0 0 ' + w + ' ' + h + '"'
        + ' style="width: ' + w + 'px; height: ' + h + 'px;'
        + ' opacity: 1; position: fixed; z-index: 10010;'
        + ' left: ' + this.x + 'px; top: ' + this.y + 'px;'
        + ' display: inline-block;">'
        + '<use xlink:href="#' + org + '"></use>'
        + '</svg>'
      );
      this.svg = document.getElementById('item-' + this.id);
    }

    /**
     * 移動
     */
    move()
    {
      this.y += this.speed;
    }

    /**
     * 中心
     */
    center()
    {
      this.cx = this.x + this.w / 2;
      this.cy = this.y + this.h / 2;
    }

    /**
     * 描写
     */
    draw()
    {
      this.svg.style.top = this.y;
    }

    /**
     * SVG削除(インスタンス削除前に実行)
     */
    remove()
    {
      this.svg.remove();
    }
  }

  /**
   * 描写フィールドクラス
   */
  class Field
  {
    // ブラウザ幅・高さ
    #cw;
    #ch;

    constructor(cw, ch)
    {
      this.#cw = cw;
      this.#ch = ch;

      this.balls  = [];
      this.blocks = [];
      this.items  = [];
      this.bar;
    }

    /**
     * ボール当たり判定
     */
    collide(ball)
    {
      let exist = true;

      let angle = ball.angle;
      let x     = ball.x;
      let y     = ball.y;
      let speed = ball.speed;
      let type  = ball.type;

      // 次座標
      const nx = x + speed * Math.cos(angle * (Math.PI / 180));
      const ny = y + speed * Math.sin(angle * (Math.PI / 180));

      // 当たり判定座標(ボール外周と障害物の接地点)
      const mx = nx + (BALL_SIZE / 2) * Math.cos(angle * (Math.PI / 180));
      const my = ny + (BALL_SIZE / 2) * Math.sin(angle * (Math.PI / 180));

      if (mx <= 0 || mx >= this.#cw - 1 || my <= 0 || my >= this.#ch - 1) {
        // 壁
        [exist, angle] = this.reflectWall(angle, mx, my);

      } else if (this.bar.x <= mx && mx <= this.bar.x + this.bar.w && this.bar.y <= my && my <= this.bar.y + this.bar.h) {
        // バー
        angle = this.reflectBar(angle, mx, my);

      } else {
        // ブロック判定
        [angle, x, y, speed, type] = this.reflectBlock(angle, x, y, speed, type);
      }

      // 角度補正(0-360度の範囲に収める)
      angle = angle <= 0 ? angle + 360 : angle;
      angle = angle % 360;

      return [exist, angle, x, y, speed, type]
    }

    /**
     * 反射処理(壁)
     */
    reflectWall(angle, x, y)
    {
      let exist = true;

      if (x <= 0) {
        // 左壁
        angle = 0 - (angle -180);

      } else if (x >= this.#cw - 1) {
        // 右壁
        angle = 180 - (angle >= 180 ? angle - 360 : angle);

      } else if (y <= 0) {
        // 上壁
        angle = 90 - (angle - 270);

      } else if (y >= this.#ch - 1) {
        // 下壁
        angle = 270 - (angle - 90);
        exist = false;
      }

      return [exist, angle];
    }

    /**
     * 反射処理(バー)
     */
    reflectBar(angle, x, y)
    {
      const preAngle = angle;

      if (0 <= angle && angle < 90) {
        // ボール進行方向(右下)
        if (x <= this.bar.x + this.bar.w * (BAR_EDGE / 100)) {
          // 左先端: 同じ角度で逆方向に打ち返す
          angle += 180;
          this.bar.setColor(BAR_COLOR['EDGE']);
          // console.log('右下→左端' + BAR_EDGE + '%', preAngle, angle);

        } else {
          angle = 270 + (90 - angle);

          if (x <= this.bar.x + this.bar.w * (BAR_BOUND / 100)) {
            // 左端: 垂直方向に切れ込む
            angle -= BAR_BANGLE * 2;
            angle = angle < 270 + BAR_LANGLE ? 270 + BAR_LANGLE : angle;
            this.bar.setColor(BAR_COLOR['BOUND']);
            // console.log('右下→左端' + BAR_BOUND + '%', preAngle, angle);

          } else if (this.bar.x + this.bar.w  * ((100 - BAR_BOUND) / 100) <= x) {
            // 右端: 水平方向に切れ込む
            angle += BAR_BANGLE;
            this.bar.setColor(BAR_COLOR['BOUND']);
            angle = angle > 360 - BAR_LANGLE ? 360 - BAR_LANGLE : angle;
            // console.log('右下→右端' + BAR_BOUND + '%', preAngle, angle);
          }
        }
      } else if (90 <= angle && angle < 180) {
        // ボール進行方向(左下)
        if (this.bar.x + this.bar.w * ((100 - BAR_EDGE) / 100) <= x) {
          // 右先端: 同じ角度で逆方向に打ち返す
          angle += 180;
          this.bar.setColor(BAR_COLOR['EDGE']);
          // console.log('左下→右端' + BAR_EDGE + '%', preAngle, angle);

        } else {
          angle = 270 - (angle - 90);

          if (x <= this.bar.x + this.bar.w * (BAR_BOUND / 100)) {
            // 右端: 水平方向に切れ込む
            angle -= BAR_BANGLE;
            angle = angle < 180 + BAR_LANGLE ? 180 + BAR_LANGLE : angle;
            this.bar.setColor(BAR_COLOR['BOUND']);
            // console.log('左下→左端' + BAR_BOUND + '%', preAngle, angle);

          } else if (this.bar.x + this.bar.w  * ((100 - BAR_BOUND) / 100) <= x) {
            // 左端: 垂直方向に切れ込む
            angle += BAR_BANGLE * 2;
            angle = angle > 270 - BAR_LANGLE ? 270 - BAR_LANGLE : angle;
            this.bar.setColor(BAR_COLOR['BOUND']);
            // console.log('左下→右端' + BAR_BOUND + '%', preAngle, angle);
          }
        }
      }

      return angle;
    }

    /**
     * 反射処理(ブロック)
     */
    reflectBlock(angle, x, y, speed, type)
    {
      let collisionDetection = false;
      let nx, ny;

      // スピードを細分化し、1から指定スピードまでの座標で判別する
      for (let ds = 1; ds <= speed; ds++) {
        // 移動先ボール中心座標
        nx = x + ds * Math.cos(angle * (Math.PI / 180));
        ny = y + ds * Math.sin(angle * (Math.PI / 180));

        // 当たり判定があった時点の座標を採用する
        [collisionDetection, angle, x, y, speed, type] = this.reflectBlockSec(angle, nx, ny, speed, type);
        if (collisionDetection) {
          break;
        }
      }

      return [angle, x, y, speed, type];
    }


    /**
     * 秒間反射処理(ブロック)
     */
    reflectBlockSec(angle, x, y, speed, type)
    {
      const range = 85 / 100; // 横方向判定範囲
      let collisionDetection = false;
      let nAngle = angle;

      this.blocks.forEach(block => {
        // ボール周囲3点で判別する
        let sa = Math.floor(angle / 90) * 90;
        for (let cfa = sa; cfa <= sa + 90; cfa += 45) {
          // 指定角度でのボール外周
          const cfx = x + (BALL_SIZE / 2) * Math.cos(cfa * (Math.PI / 180));
          const cfy = y + (BALL_SIZE / 2) * Math.sin(cfa * (Math.PI / 180));

          if (block.x <= cfx && cfx <= block.x + block.w && block.y <= cfy && cfy <= block.y + block.h) {
            collisionDetection = true;

            // ブロックの中心とボールの中心との距離を判定に使う
            const dx = Math.abs(x - block.cx);
            const dy = Math.abs(y - block.cy);

            if (0 <= angle && angle < 90 && dx >= (block.w * 0.5 + BALL_SIZE * 0.5) * range && dy <= block.h * 0.5) {
              // console.log('進行方向(右下)＆衝突面(左側)', angle, x, y);
              angle = block.type === BLOCK_DEF['DOWNWARD'] ? nAngle : 180 - angle;

            } else if (0 <= angle && angle < 90) {
              // console.log('進行方向(右下)＆衝突面(上側)', angle, x, y);
              angle = block.type === BLOCK_DEF['DOWNWARD'] ? nAngle : 360 - angle;

            } else if (90 <= angle && angle < 180 && dx >= (block.w * 0.5 + BALL_SIZE * 0.5) * range && dy <= block.h * 0.5) {
              // console.log('進行方向(左下)＆衝突面(右側)', angle, x, y);
              angle = block.type === BLOCK_DEF['DOWNWARD'] ? nAngle : 0 + (180 - angle);

            } else if (90 <= angle && angle < 180) {
              // console.log('進行方向(左下)＆衝突面(上側)', angle, x, y);
              angle = block.type === BLOCK_DEF['DOWNWARD'] ? nAngle : 270 - (angle - 90);

            } else if (180 <= angle && angle < 270 && dx >= (block.w * 0.5 + BALL_SIZE * 0.5) * range && dy <= block.h * 0.5) {
              // console.log('進行方向(左上)＆衝突面(右側)', angle, x, y);
              angle = block.type === BLOCK_DEF['UPWARD'] ? nAngle : 360 - (angle - 180);

            } else if (180 <= angle && angle < 270) {
              // console.log('進行方向(左上)＆衝突面(下側)', angle, x, y);
              angle = block.type === BLOCK_DEF['UPWARD'] ? nAngle : (270 - angle) + 90;

            } else if (270 <= angle && angle < 360 && dx >= (block.w * 0.5 + BALL_SIZE * 0.5) * range && dy <= block.h * 0.5) {
              // console.log('進行方向(右上)＆衝突面(左側)', angle, x, y);
              angle = block.type === BLOCK_DEF['UPWARD'] ? nAngle : 180 + (360 - angle);

            } else if (270 <= angle && angle < 360) {
              // console.log('進行方向(右上)＆衝突面(下側)', angle, x, y);
              angle = block.type === BLOCK_DEF['UPWARD'] ? nAngle : (360 - angle);
            }

            if (0 < block.durability) {
              block.durability--;

              // 耐久度ゼロならば削除
              if (block.durability <= 0) {
                block.exist = false;
              }
            }

            // 貫通球＆破壊ブロックならば貫通
            if (type === BALL_DEF['RAINBOW'] && block.type !== BLOCK_DEF['IRON']
             && block.type !== BLOCK_DEF['UPWARD'] && block.type !== BLOCK_DEF['DOWNWARD']
             && block.type !== BLOCK_DEF['BARRIER']) {
              angle = nAngle;
            }

            // 全貫通
            if (block.type === BLOCK_DEF['RAINBOW']) {
              // console.log('貫通');
              type = 1;
            }

            // スピード増加
            if (block.type === BLOCK_DEF['SPEEDUP'] && speed < MAX_SPEED) {
              const preSpeed = speed;
              speed += UNIT_SPEED;
              // console.log('スピードアップ(ブロック)', preSpeed, speed);
            }

            // 分裂
            if (block.type === BLOCK_DEF['SPLIT']) {
              // console.log('分裂');
              this.balls.push(new Ball(block.cx, block.cy, nAngle));
            }

            // アイテムドロップ
            if (BLOCK_DEF['BLUE'] <= block.type && block.type <= BLOCK_DEF['KHAKI'] && Math.random() * DROP_RATIO < 1) {
              const size = Math.floor(BLOCK_WIDTH * 0.7);

              // ドロップ確率を考慮
              let itemType = null;
              let total = 0;
              const rnd =  Math.floor(Math.random() * 100) + 1;
              for (const [type, ratio] of Object.entries(ITEM_DROP_RATIO)) {
                total += ratio;
                if (rnd <= total) {
                  itemType = type;
                  break;
                }
              }
              this.items.push(new Item(block.cx - Math.floor(size / 2), block.y, itemType, size, size));
            }

            break;
          }
        }

        // foreach抜ける
        if (collisionDetection) {
          return true;
        }
      });

      // ブロックオブジェクト削除
      this.blocks = this.blocks.filter(function(block) {
        if (!block.exist) {
          // SVG削除
          block.remove();
        }
        return block.exist;
      });

      return [collisionDetection, angle, x, y, speed, type];
    }

    /**
     * アイテム当たり判定
     */
    collideItem(item)
    {
      let exist = true;

      // 次座標
      const ny = item.y + item.speed;

      if (ny > this.#ch + item.h) {
        // 見えなくなるまで落下
        exist = false;

      } else {
        // バー判定
        const dx = Math.abs(item.cx - this.bar.cx);
        const dy = Math.abs((ny + item.h / 2)  - this.bar.cy);

        if (dx < item.w / 2 + this.bar.w / 2 && dy < item.h / 2 + this.bar.h / 2) {
          exist = false;
          // console.log('アイテムゲット', item.id, item.type);
          this.changeItem(item.type);
        }
      }

      return [exist, ny];
    }

    /**
     * アイテム処理
     */
    changeItem(type)
    {
      switch (type) {
        case ITEM_DEF['SPEEDUP']:
          // スピードアップ
          this.balls.forEach(function(ball) {
            if (ball.speed < MAX_SPEED) {
              ball.speed += UNIT_SPEED;
              ball.speed = ball.speed > MAX_SPEED ? MAX_SPEED : ball.speed;
              // console.log('スピードアップ(アイテム)', ball.id, ball.speed);
            }
          });
          break;
        case ITEM_DEF['SPEEDDOWN']:
          // スピードダウン
          this.balls.forEach(function(ball) {
            if (ball.speed > MIN_SPEED) {
              ball.speed -= UNIT_SPEED;
              ball.speed = ball.speed < MIN_SPEED ? MIN_SPEED : ball.speed;
              // console.log('スピードダウン(アイテム)', ball.id, ball.speed);
            }
          });
          break;
        case ITEM_DEF['WIDE']:
          // バーワイド
          if (this.bar.mag < BAR_WIDE[BAR_WIDE.length - 1]) {
            // バリアがあれば削除
            this.blocks.forEach(block => {
              if (block.type === BLOCK_DEF['BARRIER']) {
                block.exist = false;
              }
            });

            // BAR_WIDEの配列順に拡張
            let idx = BAR_WIDE.indexOf(this.bar.mag);
            idx = idx === -1 ? 0 : idx + 1;
            this.bar.wide(BAR_WIDE[idx]);
          }
          break;
        case ITEM_DEF['BARRIER']:
          // バリア(最大3重)
          let cntB = this.blocks.filter(block => block.type === BLOCK_DEF['BARRIER']).length;
          if (cntB < 3) {
            // バーサイズを1倍に戻す
            this.bar.wide(1);

            // ブロックをバリアとして代用
            const bh = 5; // バリア縦幅(px)
            this.blocks.push(new Block(0, this.bar.y + this.bar.h + 30 + ((2 - cntB) * bh), BLOCK_DEF['BARRIER'], this.#cw + 100, bh, cntB));
          }
          break;
        case ITEM_DEF['SPLIT']:
          // 分裂
          // バー位置が左側だったらボールを右上に、右側だったら左上に打ち出す
          const angle = this.bar.cx < this.#cw / 2 ? 315 : 225;
          this.balls.push(new Ball(this.bar.cx, this.bar.cy, angle));
          break;
      }
    }
  }

  // ゲーム開始
  const brGame = new Game();
  brGame.start();
}());
