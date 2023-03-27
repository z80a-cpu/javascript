/**
 * browris ブラウリス
 * host: (any)
 *
 * キー操作
 *  左右移動: ← →
 *  回転: ↑ or スペース
 *  ギブアップ: G
 *
 * URLパラメタ
 *  c: 列数(ブロック数)   初期値: ブラウザ横幅/ブロックサイズ
 *  r: 行数(ブロック数)   初期値: ブラウザ縦幅/ブロックサイズ
 *  s: 落下スピード(msec) 初期値: 300msec
 *  b: ブロックサイズ(px) 初期値: 16px
 *  e: 拡張モード         初期値: ON
 *  a: ランダム位置モード 初期値: OFF
 *  w: デフォルト壁(行)   初期値: 0
 *  例) https://anywhere/?c=10&r=20&s=300&b=24&a=1&w=3
 *      10列、20行、落下スピード300msec、ブロックサイズ24px、ランダム位置モードON、デフォルト壁3行
 */
(function() {
  let BLOCK_SIZE  =  16; // ブロックサイズ(px)
  let SPEED       = 300; // 落下スピード(ms)
  let BLOCK_NUM   =   0; // ブロック連番
  let WALL        =   0; // 壁数
  let COLS_COUNT;        // 列ブロック数
  let ROWS_COUNT;        // 行ブロック数
  let EX_MODE   = true;  // 拡張モード
  let RAND_MODE = false; // ランダム位置モード

  // クリア行数(計,シングル,ダブル,トリプル,ブラウリス)
  let CLEAR_LINES = [0, 0, 0, 0, 0];

  const EXCLAMATION_TYPE = 10; // ビックリ型タイプ

  // 次ミノ表示座標
  let NEXT_CR = {
    'x': 0,
    'y': 0,
  };

  // ブロック色
  const BLOCK_COLORS = [
    '#9DCCE0', // I型
    '#FFFF00', // O型
    '#A757A8', // T型
    '#0000FF', // J型
    '#FFA500', // L型
    '#00FF00', // S型
    '#FF0000', // Z型
    // 拡張モード
    '#40E0D0', // U型
    '#FF33FF', // V型
    '#FF99CC', // .型
    '#FFD700', // ビックリ型
  ];

  /**
   * セットアップクラス
   */
  class Setup
  {
    /**
     * URLパラメタセット
     */
    static initParams()
    {
      // URLパラメタセット
      const pairs = location.search.substring(1).split('&');
      let args = [];
      pairs.forEach(element => {
        const kv = element.split('=');
        args[kv[0]] = kv[1];
      });

      if ('c' in args) {
        COLS_COUNT = parseInt(args['c']);
      }
      if ('r' in args) {
        ROWS_COUNT = parseInt(args['r']);
      }
      if ('s' in args) {
        SPEED = parseInt(args['s']);
      }
      if ('b' in args) {
        BLOCK_SIZE = parseInt(args['b']);
      }
      if ('w' in args) {
        WALL = parseInt(args['w']);
      }
      if ('e' in args) {
        EX_MODE = args['e'] === '1';
      }
      if ('a' in args) {
        RAND_MODE = args['a'] === '1';
      }

      // ブラウザ幅・高さ
      const width  = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;

      // ブロック数
      if (!COLS_COUNT) {
        COLS_COUNT = Math.floor(width  / BLOCK_SIZE);
      }
      if (!ROWS_COUNT) {
        ROWS_COUNT = Math.floor(height  / BLOCK_SIZE);
      }

      console.log('ブラウザ表示域(px)', width + 'x' + height);
      console.log('ブロック(列x行)', COLS_COUNT + 'x' + ROWS_COUNT);
      console.log('落下スピード(msec)', SPEED);
      console.log('ブロックサイズ(px)', BLOCK_SIZE);
      console.log('デフォルト壁(行)', WALL);
      console.log('拡張モード', EX_MODE ? 'ON' : 'OFF');
      console.log('ランダムモード', RAND_MODE ? 'ON' : 'OFF');

      // 次ミノ表示座標
      NEXT_CR['x'] = width - 4.5 * BLOCK_SIZE - 10;
      NEXT_CR['y'] = 5;
    }

    /**
     * 初期処理
     */
    static init()
    {
      // 情報モーダル
      let html = '<style type="text/css">'
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
                  + '</style>'
                  + '<div class="info-area-window" id="info-area" aria-hidden="true">'
                  + '  <div class="content">'
                  + '    ' + (EX_MODE ? 'EX' : '') + COLS_COUNT + 'x' + ROWS_COUNT + '<br />'
                  + '    CL:<span id="clear-lines">0</span>'
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
           + '  z-index:11000;'
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
           + '</style>'
           + '<div class="result-modal" id="result-modal" aria-hidden="true">'
           + '  <div class="content">'
           + '    <div class="header">browris</div>'
           + '    <svg id="giveup" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="100px" height="124px" viewBox="0 0 100 124" enable-background="new 0 0 100 124" xml:space="preserve" style="display:none">'
           + '    <image width="100" height="124"'
           + '     href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAB8CAYAAACfZxWiAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAA'
           + '    CXBIWXMAABJ0AAASdAHeZh94AAA3UUlEQVR42uW9d3hVVdb4/znn3J6bRgqhE0Ag9F4VZGyAqKBgG8Vxfo6M8r4qOoOKoogyovNaxjKPgwUVy6gjI46KAoOKjd5bqAmkkJAQ0m87Z//+uNmbe28KoYjz'
           + '    vt/1eB/Dvafsvdbeq6+1NcuyBD8zCCHQNE39ret61G9CnBiCvO7/VdDP/BGNgxAC0zTRNE0RRRJj7969+Hw+9Z38xBLo/zX4WQkCoOu6Qvr69et56KGHyMjIoGvXrrjdbkaPHs13330HQDAY/KXx8cuD'
           + '    ZVnibH9M0xSWZYlQKCSEEKK0tFSMHz9eAOqTnp4u4uPj1b9nzZolhBDq3v/ET2NwNt+hnW0ZEikvQqEQgUCAIUOGsHPnTjRNo2/fvowbN46ePXsSCAT44IMP+OqrrwD49ttvGTVq1H8Ey7IsC13XCQaD'
           + '    OBwONbfq6mqCwSChUAhd10lJSVFzjWTJpwtnnWVpmoZlWWiaht1u58Ybb2Tnzp0kJSUxf/58nnjiCXr16oXf78flcnHPPffQpUsXAN58802FjF8apOxzOBwcOHCAadOm0alTJ7p160aXLl3o1q0b7dq1'
           + '    47e//S3l5eXYbLazg7+fa4domsYTTzzB7NmzMQyDOXPm0KNHDyorK7Hb7fh8PhwOB4ZhsGPHDubNm0dycjL79+8nOTn5F9klpmliGIbSBAsKCpg0aRJr166NRlqExgjQt29fNmzYcMa7A+DskDUGNE3j'
           + '    hx9+YPbs2QD8+te/Jisri4qKCgACgQC6rmNZFqZp0qVLF7xeL2VlZSxdupQbb7zx58P6SUAS4+233+Y3v/mNQnq/fv0YNGgQcXFx2O127HY7xcXF/P3vf2fLli0sWbKEq6+++owX0lkniK7rmKbJrbfe'
           + '    CsCAAQO49tprKS4uVisodtAul4vWrVuzZ88eVq1a9YsRRBJj3rx5PPzwwwC0b9+ea6+9lv79+6tFZBgGgUCAiy66iKVLl1JdXc3333+vCHImttRZI4gUggBz5sxh7969dOzYkenTp1NaWtqoYRgKhXC7'
           + '    3XTq1Ik9e/awfv16dd25MBKlrJAy74UXXlDE6Nu3LzNnzsQwDPx+v5qnHFtRUZFS1UOhEHDmhu1ZE+pyUlu3buWJJ54A4I477iA+Pl793tB2ttlshEIhBg0aBMCmTZsoKChQRuLPDbquK41pzZo13H33'
           + '    3QAMHDiQ2bNnEwgE8Pl8CCGUsiKNWMuy8Pl8ABiGcXbGc6YPkEiTq37KlCkA3HbbbVxyySWUl5cTDAaV5iSEIBAIYBgGHo9HISQzM5O0tDQsy1KGYmNEPNvgdDopKiri0ksvBaBHjx489NBD1NbWYrPZ'
           + '    1BhiV7/8t9PpxOv1npWxnBFBItkUwOzZs9mzZw8ej4c777yTrVu3YhgGLpcLXdfx+Xy4XC5SUlJYsWIFf/jDH6iqqsJut+N2u0lPTwdQdonU7X9OkOO/9NJLqaioID4+nrvuuouKigpCoRB+v7/eGCTL'
           + '    kv+XKvwvShAhBIZhKKT98MMPilX97W9/Iy8vT7lNqqqqcLlcXHfdddxwww1MmjSJ1atXk5uby4YNGxQfb9WqFQDbtm2LQtbPDY8++ihbt24FYObMmaSmpgJhZcPpdKr5NgVShpzpjj7tGcsVInnn73//'
           + '    ewCuv/56hgwZwtGjR6mursbtdjNq1CgmTZpEcnIypmkCMGTIEACKiopwu90IIWjTpg0A+fn54cH9zASRMm/u3LkAnH/++fTq1YuysjK8Xi/79u0jNzcXh8MRtUsa2rVSuP+iQl0KudmzZ7N9+3aSk5OZ'
           + '    P38+P/74I5ZlkZSUxNixY8nKysLhcERpWBdddBEAxcXFyiCTBCksLGTv3r0/K7uSK/qWW24BoFOnTkybNo3y8nI8Hg8lJSXMmTOHhx9+mJKSEiXU5f/l/M+WhX5WCGIYBrt371as6r777mPLli2EQiEs'
           + '    y6JHjx4kJiaqiURCUlISAFVVVQghCAaDyi8kiXK2QY4hGAxit9t59tln2bx5MwDTpk1TGp/b7ebVV19Vu3nw4MFkZGRgmiY1NTW43W4grCFKDiG1rTOF0yavXL3Tpk0DYNiwYQwdOpT8/Hzlz2rXrh2A'
           + '    MqYiQarD0kYJBoMkJycTFxdHdXU1e/fuZdSoUWeVGHLM0lk4b948AMaNG0dmZiY1NTXExcWxbds2NmzYAMCqVasYNmwYELZZvv76a/bs2UNCQoLydQFUV1fXe8/pwCnvEKm2Anz88cesWrUKCLtHCgoK'
           + '    FDF69uypfFIN6ehScBYVFSk24PV6ad++PQB79uw5a8SQIG0lgPfee49jx47hcrkYN24cwWAQ0zRxu9189tlnAFxxxRVccMEFat6GYTBq1Ci10DRNo0WLFsDZ29GnTBBN05Tm8cc//hGAMWPGkJGRoWyK'
           + '    UCjEeeedpybSELRr104hRzochRBK09qxY4d639kCORbTNBWbvfDCC2nbti2hUIi4uDjWrFnDunXrsNlsvPbaa1H3hUIhHA4Hffr0oaqqCqfTSWJiIgAlJSVnZbynLUPee+89Dh48iMPh4JprrqG2tpZg'
           + '    MIimaSQkJJCWltbk9k1KSopaXS6Xi1AopCZ4+PBhtRPPBmiapmTCokWL2LVrF263m/Hjx1NRUYFlWbjdbv7+978DcPPNN5Oenq60JyGEEuAJCQkqPC1tp8OHD/8yBJGTeuihh4CwqtiqVStM00TXdQKB'
           + '    AJ06dWrSlSD9Qq1btwZg//796npJpOLiYuUdPptEAXjhhRfU2Dt06KDY0ebNmzl48CAAjz32GICy1CUrhhNuEin3AI4cOXJWvAqnTBCbzcbq1avJyckB4KqrriIYDCo5YBgG/fv3B04eaLr66qsByM3N'
           + '    VbuhRYsWyrV9tjQXCYZh8NFHH7Fp0yYgLMwrKirQdR2n06kCZNOnT6ddu3aEQqF6GTNyjlKTlMpJIBCgvLz83BMEYP78+UDYAdeuXTulCuq6ztChQ3G5XFETMU1TrZ7IrX/JJZcAcPDgQRUYatmyJV6v'
           + '    F8uyOHDgwFkjhhyLlB2DBg2iQ4cO1NbWYrfbWbNmDQcPHkTTNB555JEwcmIMU6kUWJaFw+HANE3atm2rfpe765wRRE5KOv+GDh1KKBTCZrNRWVlJnz596N27dz1nnM1mU5Z9pBdX2h2lpaUEAgGlRkpV'
           + '    8siRI2eNIABbtmxRLpLLLrsMn8+nbI8PP/wQgLlz55Kenh4V+YwlCJzYLcnJycouORvjPeUdsmfPHo4dOwbAyJEjqaqqwu/3k5CQQP/+/ZUFLEEIQUVFBdXV1fUCVAkJCUDYqCotLcUwDBwOhxLsRUVF'
           + '    ZzzByDyvRx99FIDzzjuPQYMGKVV73bp15OXlYbPZmDVrlpKTTYFpmpimSXJysmJbxcXFUfP72QgSOan//u//BsK7w+l0KgeiRGLsNtd1nUsvvZT4+HhCoZDSxAB1TygUoqqqCsuysNvt6hmS8GcKMlS8'
           + '    ZMkSILw7amtr8fv9mKbJO++8A8Djjz+OruuKfTaGg4qKCgzDwDAM3G63kn/SBxe7KH8WgsiJff/990DYFyWFXuQ1kRORf0uZ8f3332O329W/4+LilNu6pqaGYDCIx+PB4/EAZ544J1mkzWbj9ddfB8Dj'
           + '    8dCnTx+lIW3atImysjJSUlJUcEqyz3rIqlsogUAgar5S65KEaIigZ5UgMkK2Y8cOampqcDgcZGVlNWonRBpSAL/73e8AmDhxIt9++23UtdLIrKmpQQiB3W5XLKCyslIthOawkViQsQqAN954Awiz2bS0'
           + '    NGXAyt0xdepUJQukdzc2QCb/jiSYEELJPKmmn0m085RkyFtvvQWEMzBcLpdSazVNi4opW5alNBEIe1QvvPBCysvLufDCCxk4cKC6V16Tl5ennnn++ecDYWEPZxYelfHwNWvWYLfb6d+/P36/H8MwyM7O'
           + '    pqCgAMMwePrppwH46aefePrppxkxYgT33nuvIkwkcSLZrmSzAEePHo1aDD8bQeRgpJ5+8cUXK6TLF0ubQcoUwzCi/Dtff/01Dz/8MFlZWYRCIaWzd+rUCYB9+/apQFX37t0ZOHAgI0eOVPefzM0dqxFJ'
           + '    nm+z2VTAq02bNqSmplJdXY3X6+Xjjz8G4K677mLLli106tSJESNGcP/99/PTTz/x4Ycfcvz48RPIqmNZsQtEvldeK+fxsxEEwipjaWkpbrebNm3aRK2SyB0SCoWU1du6dWsmT56snvH444+zc+dOtmzZ'
           + '    ogR6v379gPAOke6NgwcPsmHDBhYuXBjlZIxcrbGf2GskmwVYs2YNENauWrVqRXx8PEVFRWzZsgXDMJg6dSqjRo3i4MGDJCQkcMUVV/Dyyy+zb98+5SC1LEvJtOTk5KiEOvmeqqoqtRhOF5rtft++fTsA'
           + '    GRkZynCL1NUDgQBHjhwhIyMDCDsPExIS+Pjjj3E6nYwdO5arr75aBYR0XefAgQPKu1tZWalsGskC1q1bR7du3YCwzSIji3J36rpOeXm5QkDLli3p2rUrHTp0oEePHowYMYIBAwYo722vXr2UUrFy5Uog'
           + '    HOF8//33qamp4eGHH+bxxx+vN3e546Uc83q92O12LMsiFAqp2I6UIWfCYptNkKVLlwLhFR0fH68QEbka1q1bxxVXXKGCTatXr+bWW29lzZo1fPrpp+rz8ccf88MPP7Bv3z7lyhZC4HQ6qa6upmXLljz9'
           + '    9NMsXryYbdu2UV1dreRJvQlEZIUcPnxYuXQkuFwuxU5l8nd5eTmffPIJAHfffTcdO3ZkxIgRXHXVVeq+kpISFixYwLZt2ygoKOCFF16gb9++mKaJx+PB5XIpzVD63yJ3yOmyrCYJEggElBa0ePFiIOxy'
           + '    kEIxciVYlkVJSQn79u1TydNZWVmsXr2ar7/+mm+++Ybly5fTr18/li9fTm5uLna7HY/Hw+jRo2nTpo1KVguFQrRr1467774bv99Pbm4uBQUFVFdXKzeMYRiKVUi/Um1tLaWlpZSUlJCfn09VVVWUP6xf'
           + '    v3643W4++eQTTNPkwgsvZPDgwUB491xxxRXExcWxfv169u/fH4UL6V7XdR2/36+0t1AoRJs2bXA4HBQUFJwWEZpNEClIpaPPZrPRtm3beiqoFJ6mafL999+Tk5NDy5Ytsdvt5OTkUFhYSI8ePejbty9l'
           + '    ZWUcPnxY8fmqqiqmT59OKBTC5/MRDAax2WyqukoIQadOnejatatKU5UxeKlAmKap3OcSUT6fj6KiIgoKCtiyZQt9+vTB7XZz7Ngxli9fDoRTf2Rq0pEjRxRrgzBrHjduHF27duXmm2+mTZs2ik0WFRWp'
           + '    5DohBKmpqXg8HiXUzyQ5o0mCyG0nXQKJiYnEx8erOHgsUSSvzcvL48CBA1HVU36/n5qaGuUptdvtBINBDMOgoqJCxaclb458biAQUMqC3CFSw5PPE0JQU1OjbBZN0+jQoQMdO3Zk1KhRaJpGZWUlPp+P'
           + '    yspKxo4dS7du3Vi0aBGXXHIJw4cPp7q6mlWrVpGenk6vXr2i6kICgQAOhwO/38+GDRsUdzBNk7S0NEWQyspKJWNPhzBNEiQW6dL13JCRFutqdzqdUU7GyAFKoS01FSkHIl0OcjFETioyD1e+L3Is8n55'
           + '    j9wtkfNp2bIlzz33HElJSZSVleFwOPjiiy+AsPd57NixDeJA0zT27NnDxo0bKS8vx+12q92ZkpKi3rlr1y6GDBly2rukWUK9obhGc4TWyXKZIr8/W89r7Hqpovr9flJSUqK0tcTEREwzxNdff81PP60m'
           + '    PT2NYDBIRUUFPp8vamfquq6IASey/eVuqq2tjRrDqQr4ZhFEujJsNptypUsinavswrMB0pUi1We73Y7f7yMUsqFpDgwjhCBA7qGD2AyH8oNF2jpSbkQmXgeDQeUIlQavlDHy+uYSpUlsSnaQmZnJnXfe'
           + '    ydGjR3nzzTfxeDznJO/2bBNDunOkVmaaFg4nOF0WDodGnNdOyKzBZtOiYjjS5pJx9MiEOclypUCfOXMmu3btUmz5VPHUIEEk33Q4HFiWxVtvvcWKFSuAsPoX6SZvrlUqJyRVW6fTid1uP60M91j753Rq'
           + '    210uF15vHGZIJzc3j4O52fh8fuLcybjcboRo2jMgP6ZpRmW/Z2dnM3bsWNavXx+lmjd74cTWGErhK6l67bXX8tFHHwHhGMjMmTNVHDrSl3UyBGqahsfjwefzsX37do4fP05iYqJynfj9/mYNPjLqGClw'
           + '    I4tNG7vP6XTi8/mUQF+58t988fmPlB3PASCzYydmz56LrgehmataCIHb7Wbz5s1s3LiRb775RtlvixcvZvz48WpcUl0/JYJEukMWLVrE1KlTAZgwYYKqOI1MxW9kmBHP09C0sNZVVlbGn/70J/Ly8tTv'
           + '    WVlZzJo1S2UvnozAkhAy/dQwDKUy13fqCbXSJdjsdv768susWbMmjCBdp3WHOIqPVeIvhxZJrXj+hWeAIKZ5wpvdFAQCAeLi4vB4PGzbtk3F5AE+++wzLr/8cgKBgGKDTUG9JRmZTCyLNnv37s3tt9+u'
           + '    wrAnJ4YGaAihARYut4vDh/OZPn06eXl5xMcn0K9fPxx2O7t27WLRoreV4iCRGDkeCaZpqlqMSy+9lIsvvpikpCQMw6C2tjZiTKLuv4iYhdMJQvDgAw/w448/htOWNDvd+sazbvejbNv7IL0G2Th2vJA/'
           + '    P/08ycktGoyJNIQvp9OpPNjdunXjscceU1rXhAkTWLFihWL/J4N6BJEhzPXr15ObmwvA2LFjqaqqUsLw5GxKB8sDlg1vvJvcnIM8OvO58OANSPS2BC1IwAyCrrNs2XLWrP+O5KRkgsFadN1CiOjCGL/f'
           + '    j9PpZOTIkdxwww20bduWzp07M3nyZDIzM6NtIxECLQSWA8Nw4nK5KCos567b/4vDhw/jsgE4sUSQnZvKuf+mFzkvrZKVn96GC9i2fQcf/2MxTqfzpHONjP8IIaitrSUrK4vHH39cRT7Hjx/P/v37m5Up'
           + '    X48gkoovv/wyEI5X9O7dW7GTpgcowqtS6Ah82F06VRU+Zs9+ilryeeiBq0lOcpBXeJDNm3Zgs+m0adUK0Hnz9UVUVpVit8cDdiTbkxNu0aIFV111Fb169apXFuD1eqMmK7ABBmhB7HadYyVVzLh3BhXB'
           + '    an5321Bad3ADQSDsp1v1TS4V5cWktXIx44GeQDXLVyxXq/xkEBsGqK6u5rzzzuMPf/gDEA5o3X777eraUyKIYRhUVVWp4E3v3r2Ji4tr1nYLMys9zLf1IB63k7ff/juBwHEuGJ1O564ZHCkN1L1UIxSw'
           + '    mHzVSNKT4igoKOLbb78l3ptCIGAqmSqEoLKykq5du+L1ehuMd7vdbrVDwkLfjrBs6HoQvz/IfX+4D6jljul9mfngjRzYXwt46kZso+gomMEkBLu4f/aFdGjnIj8/j5UrV552qVpVVRV9+vTh5ptvBmDl'
           + '    ypX86U9/Ur83hs8G1ZrPPvtMxbOHDBlSzwXR6Eqpe5HNDk6XjbzDR1m16msA/vTsxbzzTpjIFifYS+uMY/z+7gEA/OvTrzhaWozH7YqSI506daJPnz7ACbdLJMhc26iRaBYeTzxbNu/A568gMR3++tIU'
           + '    XnppYd01NtACgMAEav0WUEWi5ziTrg1HMb/44otmcIWGwTAMfD4fY8eOVQnk8+fPV07TxjJToggiXyzjy927d6dLly6nkNaioWkWmh7AZnPx4Qf/wrQCjBzbgvMH9OHAviJspNW9NozA4SO9PDxnAG1b'
           + '    OigqLuKfn76P3akjUVBdXa3qMxpbVZLXh2UOmGYAh8PAshws+eeyMDJevByo5Juvd6HjAY7Lu/EDx6sK0XADFdxwcw8gnImYn1+AYTMQNN/W0TRNJZ/rus6DDz4IhINwM2bMAGiUHeqxEy0qKorKfW2u'
           + '    rQFEGFMWR48Wsn7degzgT4+MAvZjWGBSW8eO3Nh0GDQsHTsFzH4kXOL27YqfyM/PC2tFhOVD2NdUP04d6c6Q4xSAjgPD0Nm3fxsHcveS2gL+v2szCZGPYepYBMLbWdTJGiBQ6wa8BEUlQ/q2Ydiw8I5c'
           + '    9tViHIYDQ4Cu2ZpNFF3XcTgcBAIBWrVqxdChQwFYuHAhR44caVR70+XE5ORkrEDXdbp164ZlWQ2WBje8MgRYBobm5fvvfsAXLGLEiERGDW8DHCc1wYXARNdNwMLrBZuzCijh9jt7MmpoOj5/BVu2bMFm'
           + '    2LAsi8zMzJOqjLHaixAalhVkz97dQCXDBidhpwIbPqxACNDqNqgAajEUcS10LMBO61ZhNfzokRIMy41mOdBwQDO5l6wEkOMeP348NpsNv9/Pe++9F7Wg6hFEgmVZLFiwAAhH11JTUwmFQlGu9JOBBTgd'
           + '    XrZt3wnA5Bv7AaVAgMQkB2CvY1Z+HHY7hqFjikqggkHDwvH1nTt2IAi742VMPTJUGztmmZ9LHY5tdhO7w+BIfhkAI0a3B3xYGGgR7BJMwIYFWFol4KtDSYjW7cM71Aw6QDs9B6pc6JWVlfTt25fu3bsD'
           + '    8Oyzz6rfY+cU9aY1a9aoROorr7wSn893yklqui6orCpl1+5wBVS3nklAGRCi77BEoAIdJ2CjsjKIGTKwcAA1JKWEkXDsWAVut1ul+zfFNnVdV6HgE9mEJqBTUxPOEhkysg1QhWW6CPgFGnHY7A4Mw4ZD'
           + '    82ADEhK9gKOOWMVcfHkmAEHTj2bUYth9WNbpFRBJt4lkW/n5+So1KdJzXo8gMjM8JSWFli1bnuDLzXQfCwGGrqEhMPRwFmCcKwPoBrTlmuvq6kZMGxCiNgChkIauueoGF6xDcvidHo9HaVWNEUX6h2SV'
           + '    rKZBMGhhEEday2TikmDI8FaYaAhNEAiaCGoQVgjTDBEQx7julo5kdnBgWn4QdsBHedU+ANwuL5pmEjRrT0vbkt7gyspK+vfvr+YjU3JjI4tKhkA4awSgbdu2pKSkRGUmNhcsC1zuJGbcNZs5jzyB19mH'
           + '    Pz+5gmf//G86de5Jv4FeLKpp29nNkmXX4nBVETKDgIEpwgkJyclJ+Hw+1WtEBociPcbyI511soRAAIbupPx4gIsvHs3r7/yWeLsNAy923U33XilAEKfH4urrBvPO4pt4+83rERwALYAm7IBGYXEBOjYG'
           + '    DbiQUNAgFDA43QpAmS6UnJxMhw4dAFTidyxESUPJrrKyslQk7FRyjDRNwxImVdVl9OrTHpvNxr9XFjBzVliePPrkk3Tv1hao4sabRzP8gkwMjmIYXqAztbU5AHTt0gNN05S6a7PZlHVuGAYFBQV8/vnn'
           + '    6LpOVlYWI0aMICMjg+3bt6NrOiYBdN3A5XKTlNSWglqNNxZ+S49ObRg4shdLv1rJhcN78cBDw/C4jrF960G8SalktndSaxbhNuK47OIrsT9jo2PGZVT7CnE4XJgi2GyhHoWTOjlns9lo3bo1+/btU5ps'
           + '    vaIgy7KEpmkUFhaSmZmJ3+/nySefpGPHjjEOuxMvgOhYs4TY72QmyPr161n4xrscK4soaNFAt8Nlo9sz8lc9qKqyGDr4OvJyfYy7fCydO3eKemZkF4iJEydGrbD58+dz//338/LLL+N0unC6dMyQHUw3'
           + '    Lm8VeQXZ/PHeJ0+sQt2FaQUQnODd8W54/6MbueyygRQWFPPTBgvf8c5YwURsDj/C0rA0HaE1bpM1xUkkC168eDEffPABEC52zcjIiBLsaoeUl5crizwxMRGfz6cQEBlriGzHFBmXNgwjqoRNruyqqiqG'
           + '    Dx/GyBGjyMkpZNfu7azfsJKtW3ZjBnSWLj/E0uWHaNsmk1kP3Ey8N8waLEsghBU1Brljhw4dypIlSxg+fDgdOnRQNe+XX345X3zxBQ5HPBoGmmERCJi0btWBu+76HZ9/tZai4oNUVVeACYbNgxkQ2G06'
           + '    7TM7sXlDO8pLPJj+rph6ALstEZvTImQFsNu8WJqOKawomRrpAD1ZpolMspBQUlKiMj3rESQ2e8PlcuFwOFRcOHLVy2vl35GNvCQhJOHCGX61CFFJWloCrVqfz8RJF1JVGaKmWmfrnrX8+MN3PHDvbOK9'
           + '    diyzFk13oGk6mla/+EcIwYMPPqisXwmWZdGxY0eSk5M5fDgH3dCw2RzYDQeBoEmbNt2ZdkdXNENg6Doutwtds+FyetB1Dy7Dg99XTsDvx9Dc2HUHoWA1aAGcLg+6Bi6XHc1wRmW/QDixQfaRbAoiSxdi'
           + '    cV6PIJGQkpJCfn4+q1ev5tixY1RUVFBZWRmV/R0XF0dSUhKtWrVSWeWpqakkJSUp4sjdEw5OOBGECIUsio8EcLttBK0Ssrp3ZdYf/5vUFu0RARNNFwjTAkNvlF3LZDr5jkjkXHfddfh8tWi6ha6DwxYf'
           + '    9gxoYJqC2toaKquPU1lZTWFeMUdKCuqccAKnzcBts6FZBmg27K54jhaXkHOwgIrKI+Tm51FWVqlSlux2Ow6HgxEjRtChQwdqamqaRRQJDbE4W0M/mqbJn//851Ou8UtOTqZly5a0a9cOh8NBXFwcbrcb'
           + '    m82G0+kmLs5NRkZrUlMyMAwNMyiYMukaUlq0wAwFMGx2BA40zaApM1RqXnJxwIms+3DAyINhaFDnf7KEQFhBhGXH43Hj9cZxpGAD//znYo5XlOKrraG2NoSh6+iahq7ZKK8s5/DhXA4dOkR1TXWT816y'
           + '    ZAkDBw7k7rvvbjK+H9tmJLLLniqQlT/GxcWpC3Vd56abbuLAgQOkpKSQmppKYmKiell5eTk5OTkcOXKEo0ePUlxcTGlpKWVlZZSVlbF79+4mJ5CYmMCIESNZuHAhKS1a1K14e52IDQ/4ZMpMrPYnd0wk'
           + '    bw/71qTF7IjSWu+5517Vp+Vk4HQ6yMzsRHp6OgkJCSQnJ+NyuTh+/DhlZWWsX7+eDRs2sHr1as4///wGK8sasuca7EEp/4jsGXjw4EGGDx/O8OHDVelXJOi6zsCBA6Nq6UpKSqioqKC8vJy8vDzy8/NV'
           + '    v0VZYFldXU1JSQnl5RWsWbNGCTj5nFOxdxoqzqmvETZ+/5w5c/jwww/VfdI7u3PnTjweD+np6fTs2ZOMjAySk5Pxer0qbi+VGLnCg8EgxcXFpKenU11d3WRSYOxRHY0SpEWLFvTs2ZMdO3awfft2evfu'
           + '    TVlZWYMPj+05KAkaHx9P27Zt6du3b70ommVZeDwe3G43W7dujWpO05xUIKnBSN69bt06Vq1axX333VdP4zkZCCEYM2YMY8aMqfdbMBjkL3/5C927d8fn86mM+7KysiYXR0JCQpPEgPBCjqxll0VLUUkY'
           + '    kZPt3bs3O3bsoKCgQIVsG0JYLDFi83JjiyIl1NbWcu211/KrX/1KITkylbSx7p9yMrIx/tIvljLhiglYlkXnzp2ZOHFi3f11IQA4Kc9riHimaWK327n11ltZtGgR8fHxKvm7qUUjE+hi5xuJLzlfaVo4'
           + '    nc4Id09EZqQcCKBWbV5envouEmGRNzZURhZ7jTTmLMvC6XQyefJk5UqPrMCKrFdsbOJmXdZhft4hxk8Yr9jF3XffSzAYAmGiY6JpJkKzaEgriHW7QJg9Sze5tCVSUlKYOnUqNTU1UWOS6v+pfuSzg8Gg'
           + '    ahfSuXPnKLmtFh6cEJCy0Obo0aOqoczpQiQxZPMA2ac3cqCRxT+yNK6hHaLp4e9+97vfgoD/+sO9dOzSk0OHDrLwtbdAM0DUommBcMZJA6DrOs888ww33ngjixcv5vnnn6dTp0589tlnKttGIr9FixZc'
           + '    ffXVHD16NIoYkacBNfcTeb9s4yTdQg263+WXaWlpQDiLUHYraAzZJ/teDsCyLAYMGKCclZHGUFgddnLHHXeotheyYisWDE3n9b//g6Vf/psM4MmJk5h/6/UA3Hf/H8nNzQMjHnCh42hUbY6Li+P999/n'
           + '    mmuuUeFUGXOJ3DmBQIA2bdowZswYZfRF9s46FZB1k8eOHVOtAAcOHHhisUUswCgrRnYFDQaDjaZ2RqZyyjwtCO+y+Ph44uLiVECrtraWjIwMOnfu3GSq6LJly5g7dy6LFi1S74foLkIA998Xts4fu+Um'
           + '    vHv2cN2Arozs0YWqyjJun/Z7NSXLBMmzYnf65MmT67krbrvtNhYsWBDVhExa1L1798br9eLz+ZQ8kfMwTVMVC0m229BHun2qqqpUYahMoY3lBlEY6tatm3IP79mzp94OiTRspLMsKSkJXdfJy8vjo48+'
           + '    4oEHHuCOO+7g97//PdOmTeOqq64iNTUVt9vN1KlTo54pESVbJk2fPp2lS5cqOSP5rqZp/OUvL1NasI9BGWn8+qIx4DtOqDCX5+++nXRg2Vef8/Bj4bZRulHHv+sWityt//jHP2jbti1HjhyhZcuWXHfd'
           + '    daoOctq0abRv357MzEyuueYavvzyS3Jzc9F1nYkTJ5KSkoLD4cDtdisiyzTWyOz4hj4QTmqorKxUC7hjx47hscYsUpv8UmZxDx8+nNzcXNasWdNgV1DZRlW22vjhhx/YtGlTg41iJEuSPXwlS5QgB3fD'
           + '    DTewfPlyFi5cyPjx45k2bRpPPPGEchoCPPZYOF92+uUTcOkWfiOIFTLpnZzE/b+exB/f/Sfz5s7Bm+rigen3qJVnGAZ79+7lgQceUIWr7dq148svv6RHjx6EQiGWLVvGq6++ysqVK8nJySEnJ0ddm5qa'
           + '    Sq9evfB6vTidTtLS0sjKylJ9sizLUqV0Da34yN0jT35IS0tT3fRiQSVbS1b0wQcfcP311xMfH8/zzz+Py+WitrZWZXknJCSwefNmXnrpJVV7CGE75LzzzqN79+4MGjSI9PR0nE4nY8aMUfq2bHQZO2C5'
           + '    Su666y5efPFFIOyUnDZtGjNnzuT111/nkUceYUSP7vwwdy4UH8QyQLOcYIOQ28t/PfcyCzaEYwwDR13IdVdfSUXFcVZ8+gWr6xAB4cMCFi5cqJL/YvOu1q5dyyeffMK3337L1q1bValzFFupq6Lq0KED'
           + '    gwcPZuTIkTidTgzDqJcwLguDfD4fr7zyCuvXr2fSpEksXry4YRU5Mvtd0zR2795NVlYWEO680KFDB0zTVA31X3zxRRV+lK7wiy66iPPOO0/1KpElym63mxtuuKEei2oIpPW7c+dOZsyYwbJly6IvcNiZ'
           + '    NHo0/5g2Db3wYDjbFAeYPoIOJ8HUDOYueJMXln5FbQPPHz7oAh54ZCZXXjGh0bE0pN0VFBRw6NAhNm7cyLvvvktOTo7SQiVMmjSJm2++WVVP1ZMLuk5hYSHPPPMMxcXFvPnmm9xyyy0NhqXrEQTCHRGK'
           + '    i4u58soruemmm1RsZN68eezatQsIxx4mTJhAenq6ykqXJWNwojp14sSJiseezBMqrXAIRy/nzZvHV199RauMDEorKgnUVLNo+h3cNHwgVB0HTWARRNMNajUHWnwyO/bnsuhfX7DfDFIQDLJp0za6ZXZj'
           + '    94Hd6h2NuWoiS9Xkb7I1LITbi+Tk5FBdXU1FRQUHDhzg2LFjqplCY8/0er1s375dNdZcv349AwYMaBAHeuzNcKKd0rJlyygpKcHr9fLyyy+za9cu4uPjefLJJ7n99tvxer1UVlZSXV2tmpNJmyLS1xMZ'
           + '    T2kKZBxFCMEFF1zAl19+iRCCgsJC/vREOC/2xcWfcAydoBAEQz50TaBZQTyWH2dFCYMykvnLff/F2089SXldd54vViyrK08QTfrNZIw+0laKZLNOp5PCwkKEEMTFxdG/f38uvvjiBl0gsTtE1sSkpaXR'
           + '    r1+/phPlYmHGjBmqeH/t2rX89NNP/PTTT0CYjXXu3JnS0tKolkwNNYGprq6O6r5wKhBZwwfwX3feic2VwNrCQr7bshW7x43NbmIJDVFnd+hWEIKVUHWMHz/+mAN5R0jr1IVOndqDrxYZsT3d2kiPx6OU'
           + '    FNM0CQQC+P3+JpP47HY7+/btU2z+kksuabLBWYPlCCkpKer4ia+++ko1/7rtttto3769qqI6mSOtsrKSw4cPR4V3TwWk/h7WAG3cdGs4k/yl9z4EVzxmyAa6HVMHC42QLhC6BZqgtOI4AP379gYgJADt'
           + '    DE9Qq4vDNDeTU/ZFWblyJdnZ2QDcc889QOOOUL2hhwA899xzJCYmUlhYSGlpKd26dWPMmDHqRJzmsqAz7YkeWTj5+9+FT377Or+Abw7mY9NbolsmBiGEZgIamjDA7WXVwUMAtEkJp4SKcMLoGY1FljpH'
           + '    Vug2BPL7uLg4srOz1YlBo0ePZvDgwU16uBusoDJNE5vNphqWQbg5S1xc3Cn1QTQMg5qaGuDMW3CboRBD+w/kikkTMYHXPvgAvF4wQbN0bJaOzdLA0sCCA3nhhTB8WLgJmmG3wclLXJoEv98f1X+ysdCE'
           + '    hEAgoAqfAJWmG+u4PSlBpGtk4sSJqvv0xx9/zJo1a1Rr1+aUImuaptoqnQlBwslv4dDN9LvCXVH/vXUb5TYbQd0AS0MENURIB91GjT9E/rHjAAwdVFfKoIkz3SBUVlY2GSKQ7dYNwyAxMZGvvvpKCfNH'
           + '    H32Url27KtfLKRXsRCL6lVdeUe6UJ598kuzs7CijqimiSDmycePGM0KEBliahWUFGDV0JEkpqRwxLVbs34MVH09AM8KsSujgcrOn8AgHy8tBc9G+TQfC+pV52gSRK/rgwYONaowyZVTi5dChQyrLvXPn'
           + '    zipLRsrexkyABr+NRHRaWhqrVq1S9sHcuXPJzs7G5XI1GISKnYg8IKUhYjcbBJiawNIN3G4ns2aEj8l4atEbhNwOhE0PcypdA4+L7zduIAQMvmA0SamJmFaAIKfXS1ciOj8/n5KSkpPmXclevm+88Yaa'
           + '    63vvvYfT6WwWu2/SUpORsPbt2yu1NxAI8Nxzz0XFLRoVUBF9bvft26dWxukQxSZ0dBF+3h133RnuSL17P3Pefh9fajv0Vl2wkttSk5TB2z+FeyxeOip88JiGHZdxerWCkrVkZ2efvOhfC5+tsmHDBrZs'
           + '    2QKE05KGDBlSL+Ok0Wc0dVp0pGqmaRorV65Uh3mlpaXxP//zP8TFxXH8+PGoYx3kvXIAfr+fYDCoDM7T6kkoR1mXRbJixQrVzH9Ynx6MO38MLdJSWb1jE+/+41PcHg97srNp27btGQXapOr93nvvRUU5'
           + '    Y/EEYY9ubW0t06ZNUypv9imOoVnHd0sBbhgG7777LjfddBMQ7rr24IMP0qZNG+WEi4wXyNVls9lUvZ08gflM+hJKRH322WdcM/HqcL17DLz11ltMnTr1jIgh3/Ppp59SWFioalZinYfy33FxccyaNYu9'
           + '    e/cC8Ne//pU77rjjlMoCT/k8dU3TePHFF7nrrruAsJd3xowZ9O3bV8WgYzvgSD9WVVUVY8aMUb17T7d7Z+QhYwUHc1m2cjk/rF+LoRu0apHC2MvGMfT8kWdEeOlX27p1K+vXr1c9sRrK69U0Da/Xy5Il'
           + '    S3j77beBcKfst95665THcFoH3Mf2QYFwt4dbbrlFtcOLHYQklGmaTJgwIepUnlMFmXStaRohBLYG1Ce/318PgU1BbFaN9HyvWLGC+Ph45ZtrqIjJZrORk5OjTpl2u93s3LmTjh07ntLugNOsQPH5fNx8'
           + '    882sW7dOhX2//PJL7rnnHnbs2KFaL0WGMWUCt2EYfP755xw9ejQq+ngqrEUlrJkWpgnCBBEQEARLhN0kTqejWciIDCxJpUPTNNatW8c333xDixYtlLEcSQxJINnz8ZVXXlHPfPjhh1VE8FT9eKe1Q9TN'
           + '    dZO9/vrrVc0DhFvJ3nbbbaSmpqretrE7wbKsqONYz6wznYiU+eFvRPON0djQwLfffsumTZuIj4+PsjsinyfZclpaGq+++ir/+te/ABgzZgzvvvsurVq1Oi35ddoEiZ3E1q1bmTJlSlRr8Msuu4wrrriC'
           + '    du3aUVlZGdWNTSaIjR49WqUfnakAbs6YG3O7CyE4evQoS5YsUW53uWvkWGOt9ISEBFavXq0aLbRt25bFixczePDgU2ZVZ0yQWARK4jz77LM89NBDqiQhLi4uqpWS7K1bXl6uCuuzsrIYNmyYar/X3PjJ'
           + '    6RCjoTGXlJTw3XffUVxcrKKekiVFZtnIeInf7ycpKYnc3Fzmzp2rIoWvv/46N910k5JdpwNnRJBIkH3bZeLyvffey4IFC6J8NikpKQwYMIALLriAnj17EgwGCYVCKkngxhtvVJG3nwNid3V2djbr1q1D'
           + '    CEFVVZU6P6SxyuPIWsH8/HyefvppdUTFb3/7W15//fWobMxzvkNiB6seWicc9+7dy8KFC3njjTfq1Zp07tyZPn36MGzYMNVTvby8XBW/xCLyTIgQmwC3a9cudu3apfr2ytaDsVph7PudTidOp5OcnBxm'
           + '    zZqlwtVjx47lo48+wuv1RtVE/qIEafDhEQP6/PPPo472jgSHw0FycjIOhwOfz0f79u2ZPHkyl156ab3Ys1SdpSMvEiJDwDJxWo6hsrKS3bt3s3XrVoLBoDo/KxLhciHJsIHNZlM9S2TXuhUrVqiEPgj3'
           + '    g3nttddo3bp1vUV5Wjj7OQkihXhkXV1ZWRlLly7lqaeeUo0KmoJ27doxceJEZVDK9hQNQUNFl0eOHGHr1q3s2LEDj8eD1+utp8LG1r3ruk5SUhLl5eWUl5dTWFjI2rVr+fHHH6MOeJk4cSKvvfaaasx8'
           + '    JqzqnBBElg/I+HisZb5z5062bdvG2rVrOXDgAEVFReTn51NYWNioZ7R169aMGTOGgQMHkpGRQVxcHGlpaaSnp6uDZnbt2kVubq46Y1cm7EX2nZfEkJVXslFBXl4ehw8fZs+ePRw4cICysrJ63aq7d+/O'
           + '    I488wuTJk7Hb7VGdis5UGflZCQI06Go42cCLi4vZvHkz+/fvZ+PGjWzdupWcnJyoxLzGiDV48GAGDhxIXFycUjCk5lZWVqZOyiktLaWqqopjx46pkrzq6upGDzrr1q0bl1xyCVOmTOH888+vx+7OFvzs'
           + '    BGkKIlXKSHdIQ3D8+HH27dvH5s2b+fHHH9m9ezeHDx+Oajl7NiEpKYkePXowduxYfvWrXzFs2LCoQ4lPN3HjZPCLEyRy10Tq/5EuCnltLAJk8en27dtZtmwZy5cvp6SkpFmBIKkxud1u4uPjSU5OZsCA'
           + '    AUyYMIGkpCTatGlDZmamul7uLKezfp36/xmCNBcaLuhsGBn5+flkZ2ezfft2Nm/eTHl5ufJFtW/fnt69e9OzZ08yMzPVydQngzMV1KcC/ysI0hTEqr6n6tKPtBsi5YFMZjvTuM2pQrMPBftPBcnWGlM7'
           + '    GypWld83Vj8ZWe9xruF//Q5pDE51ZTdU1H8ud4aE/z2nsZwinIrrPVY1j/39XML/WYI0BVLNltFNCTLGEdntqDlNDc4m/CIsqzkZj6f6nFNhLw15DSL7XUU+61xqWHAOhbpcdbKW8WRHQASDwUaTuqUd'
           + '    0FABqYw+NoVE+dszzzxDRUUFNTU1zJ49m4SEBIqLi3n++efRdZ2UlBRmzJjxf3OHnM4qCwQCDdoJ0sL/4osvWLVqFfPnh6tvIw22poSy/N7j8Sg/1Z49ezjvvPPYu3cvXbt2BYiqrzxXcE52iKZpLFiw'
           + '    gKVLl9KyZcsGERWZ0eH3+0lMTOSFF15otEj06NGjTJ06ldLSUp566inmzZvHrFmzABpMMYrsLCHfHx8frwginYyR98nE8nMKlmWJn/sjhBC/+c1vBOH8w2Z92rVrJ4QQ6hmmaYpQKCQkzJ8/X11rGIYA'
           + '    RK9evYQQQpimqe4LhULC5/MJIYSora0VQgj1nPT0dPWMAwcOCCGE2L9/v/ouPT09agzn4nPOtKzmZpVIFnXiCKQTEKnx3H///Rw6dIjhw4cr+SRTcSKt93CHOScffvihaqUR6R/7j4NztUNCoZAIBoMi'
           + '    FAqplRsMBoVlWSIYDAohhPjggw/U6szKyqq3OiXs379fRMILL7wg5syZI4QQoqqqqt4933//vQBEq1at1A4SQoi0tLT/uB1yTmSI5N+RsiOSV0v+nZycrL6LPdlGak+6rtO5c2c0TWPmzJlcc8013H77'
           + '    7Upz83g8ysaw2+18+eWXjBs3Dgj3yT1y5Ei9Xif/SXBOWJamaezYsQNN08jIyCA9PZ20tDRSU1PV/1u1asV1113X6MFZMrQqC1CFEDz11FMMGTKEefPmRV0ru+889thjjBs3LopdNhaA+k+Bc2aHyBPL'
           + '    TtbptLGTZ6QxFx8fT1JSUlRs+6qrrgJO7ETTNBk3bhzLly+PKh9bv3497du3b7KF+i8tV86pt7dnz57Ex8dHHS0hweFwkJ+fz/bt2xu8V0YWp0yZwpQpU1i1ahUfffQRGzduVL2ndF1n6dKl/PrXv1Y9'
           + '    Eq26Y2I3btxIr169onKzInt3RRquEn6R3XSuhFVzYMWKFUqgDhgwoFGBKpWASNi9e7cYNGiQul/TNAGIDh06iGPHjkU9S0LXrl1Fenq6SE5OFtnZ2UIIIbZu3SocDodo0aKF6NOnj7r2XOHpnGlZfr9f'
           + '    1NbWimAwKAKBQL2PEEK8//77CqESGScj8LZt28SVV16p7rPb7ervadOmqev8fr+yT4QQyjaJhJqamnqLR2qC/+cIMmHChGYZhDabrVG1Vz6rrKxMvPLKKyIzM7PBZ3Tp0kWsW7eu0dUtd9gTTzwhkpOT'
           + '    xQ033BBFuMmTJ4uUlBTx3HPPnXO195wRZMqUKadkqWdmZjZKkJdfflkAQtf1qHsSExPFq6++qpBrmmaU1R75jOzsbAEIt9stALFgwQIhhBAvvfSSAITL5RKAKC8vP6dEOWdC/ZJLLlEZHlITgugj72RX'
           + '    0kAgQEpKCtBwhe+dd97J3/72t6gjmh544AF11Glk9ZR8RizI32SWvvQQyHHJ78951PA/SajHgt/vb/RZ2dnZolevXmLJkiVR9zRnLNJSf+2110TXrl3FjBkzRHV1tXrGnXfeKVq2bCneeeedc86yzpn7'
           + '    3apraSQNPGlNyyPvIuMbIiZhOhZksrUE2R21OSk9kWOJtXlkAlykISl327mC/x8bDhNJVjxoogAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMS0xM1QwNjozOToxNSswMDowMBfoiXQAAAAldEVYdGRh'
           + '    dGU6bW9kaWZ5ADIwMjMtMDEtMTNUMDY6Mzk6MTUrMDA6MDBmtTHIAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAxLTEzVDA2OjM5OjE3KzAwOjAwpj8BPgAAAABJRU5ErkJggg==" />'
           + '    </svg>'
           + '    <table border="0">'
           + '      <tr>'
           + '        <td class="ttl">画面サイズ</td>'
           + '        <td class="cntt" id="bscreen">100x50</td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">ブロックサイズ</td>'
           + '        <td class="cntt" id="bsize"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">デフォルト壁</td>'
           + '        <td class="cntt" id="bwall"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">拡張モード</td>'
           + '        <td class="cntt" id="ex-mode"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">ランダムモード</td>'
           + '        <td class="cntt" id="rand-mode"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">スピード(ms)</td>'
           + '        <td class="cntt" id="bspeed"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">経過時間</td>'
           + '        <td class="cntt" id="belapsed"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl">クリアライン</td>'
           + '        <td class="cntt" id="total"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl cl">シングル</td>'
           + '        <td class="cntt" id="single"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl cl">ダブル</td>'
           + '        <td class="cntt" id="double"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl cl">トリプル</td>'
           + '        <td class="cntt" id="triple"></td>'
           + '      </tr>'
           + '      <tr>'
           + '        <td class="ttl cl">ブラウリス</td>'
           + '        <td class="cntt" id="browris"></td>'
           + '      </tr>'
           + '    </table>'
           + '  </div>'
           + '</div>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // ブロックSVG
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgblock" viewbox="0 0 16 16">'
           + '<g>'
           + '<rect x="0" y="0" width="15" height="15" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // 次ブロック背景SVG
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
           + ' style="display:none;">'
           + '<symbol id="orgbg" viewbox="0 0 16 16">'
           + '<g>'
           + '<rect x="0" y="0" width="16" height="16" />'
           + '</g>'
           + '</symbol>'
           + '</svg>';
      document.querySelector('body').insertAdjacentHTML('beforeend', html);

      // 注意SVG
      html = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"'
           + ' style="width: 64px; height: 64px; opacity: 1; display: none;" xml:space="preserve">'
           + '<symbol id="orgexc" viewbox="0 0 512 512">'
           + '<g>'
           + '<path class="st0" d="M509.08,448.217L274.676,42.218c-8.299-14.376-29.051-14.376-37.352,0L2.922,448.217'
           + ' c-8.301,14.376,2.074,32.347,18.674,32.347h468.806C507.003,480.564,517.378,462.594,509.08,448.217z M277.035,423.636'
           + ' c0,2.68-9.418,4.853-21.033,4.853c-11.619,0-21.037-2.173-21.037-4.853V389.98c0-2.68,9.418-4.853,21.037-4.853'
           + ' c11.615,0,21.033,2.174,21.033,4.853V423.636z M273.529,345.11c0.008,0.1,0.066,0.195,0.066,0.3c0,4.344-7.879,7.866-17.594,7.866'
           + ' c-9.721,0-17.596-3.522-17.596-7.866c0-0.102,0.056-0.198,0.066-0.3l-10.936-140.5c0-4.344,12.744-7.866,28.465-7.866'
           + ' s28.463,3.522,28.463,7.866L273.529,345.11z" style="fill: rgb(223, 86, 86);">'
           + '</path>'
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
    constructor()
    {
      console.log('*** ゲームスタート ***');

      // ブラウザ幅・高さ
      this.cw = document.documentElement.clientWidth;
      this.ch = document.documentElement.clientHeight;

      Setup.initParams();
      Setup.init();

      this.startTime = new Date();
    }

    /**
     * ゲームの開始処理
     */
    start()
    {
      // フィールドとミノの初期化
      this.field = new Field();

      // デフォルト壁
      if (WALL > 0) {
        this.setWall();
      }

      // 最初のミノを読み込み
      this.popMino();

      // 初回描画
      this.nextBg();
      this.nextMino.drawNext();
      this.mino.draw();

      // 落下処理
      clearInterval(this.timer);
      this.timer = setInterval(() => this.dropMino(), SPEED);

      // キーボードイベントの登録
      this.setKeyEvent();

      // タッチイベント登録
      this.setTouchEvent();
    }

    /**
     * デフォルト壁
     */
    setWall()
    {
      // 最下部から1行ずつブロックを生成する
      for (let i = ROWS_COUNT - 1; i >= ROWS_COUNT - WALL; i--) {
        // ブロック生成
        let wblocks = [];

        // 非ブロック数(1-2個)
        const nCnt = 1 + Math.floor(Math.random() * 2);

        // 非ブロック位置
        let nBlocks = [];
        for (let j = 0; j < nCnt; j++) {
          nBlocks.push(Math.floor(Math.random() * COLS_COUNT));
        }

        for (let j = 0; j < COLS_COUNT; j++) {
          if (!nBlocks.includes(j)) {
            const block = new Block(j, i, Math.floor(Math.random() * 10));
            block.draw();
            wblocks.push(block);
          }
        }

        this.field.blocks = this.field.blocks.concat(wblocks);
      }
    }

    /**
     * 次ブロック背景
     */
    nextBg()
    {
      const nextSize = 4.5 * BLOCK_SIZE;

      document.querySelector('body').insertAdjacentHTML('beforeend',
          '<svg viewBox="0 0 ' + nextSize + ' ' + nextSize + '"'
        + ' style="top: ' + NEXT_CR['y'] + 'px; left: ' + NEXT_CR['x'] + 'px;'
        + ' width: ' + nextSize + 'px; height: ' + nextSize + 'px;'
        + ' opacity: 1; position: fixed; z-index: 10000; fill: #706D6D;'
        + ' display: inline-block;">'
        + '<use xlink:href="#orgbg"></use>'
        + '</svg>'
      );
    }

    /**
     * 新しいミノを読み込む
     */
    popMino()
    {
      // 次ミノがビックリ型ならば、次ミノ表示を削除
      if (this.nextMino && this.nextMino.type === EXCLAMATION_TYPE) {
        this.nextMino.removeExc();
      }

      this.mino = this.nextMino ?? new Mino();
      this.mino.spawn();
      this.nextMino = new Mino();

      // ゲームオーバー判定
      if (!this.valid(0, 1)) {
        this.gameOver();
      }
    }

    /**
     * ミノの落下処理
     */
    dropMino()
    {
      if (this.valid(0, 1)) {
        this.mino.y++;
        this.mino.draw();

        // 次ミノ描写
        this.nextMino.drawNext();
      } else {
        // Minoを固定する（座標変換してFieldに渡す）
        this.mino.blocks.forEach(e => {
          e.x += this.mino.x;
          e.y += this.mino.y;
        });

        this.field.blocks = this.field.blocks.concat(this.mino.blocks);
        this.field.checkLine();
        this.popMino();
      }
    }

    /**
     * 次の移動が可能かチェック
     */
    valid(moveX, moveY, rot = 0)
    {
      // 見えないブロック(svgタグ追加なし)を生成し、判定に使う
      let newBlocks = this.mino.getNewBlocks(moveX, moveY, rot);

      return newBlocks.every(block => {
        return (
          block.x >=  0 &&
          block.y >= -1 &&
          block.x < COLS_COUNT &&
          block.y < ROWS_COUNT &&
          !this.field.has(block.x, block.y)
        );
      });
    }

    /**
     * 終了処理
     */
    gameOver(giveup = false)
    {
      clearInterval(this.timer);

      console.log('*** ゲームオーバー ***');

      // 経過時間
      const endTime = new Date();
      const datet   = parseInt((endTime.getTime() - this.startTime.getTime()) / 1000);
      const hour    = parseInt(datet / 3600);
      const min     = parseInt((datet / 60) % 60);
      const sec     = datet % 60;
      const elapsed = hour + ':' + ('00' + min).slice(-2) + ':' + ('00' + sec).slice(-2);

      const bscreen  = COLS_COUNT + 'x' + ROWS_COUNT;
      const exMode   = EX_MODE   ? 'ON' : 'OFF';
      const randMode = RAND_MODE ? 'ON' : 'OFF';

      document.getElementById('bscreen').textContent   = bscreen;
      document.getElementById('bsize').textContent     = BLOCK_SIZE;
      document.getElementById('bwall').textContent     = WALL;
      document.getElementById('ex-mode').textContent   = exMode;
      document.getElementById('rand-mode').textContent = randMode;
      document.getElementById('bspeed').textContent    = SPEED;
      document.getElementById('belapsed').textContent  = elapsed;
      document.getElementById('total').textContent     = CLEAR_LINES[0].toLocaleString();
      document.getElementById('single').textContent    = CLEAR_LINES[1].toLocaleString();
      document.getElementById('double').textContent    = CLEAR_LINES[2].toLocaleString();
      document.getElementById('triple').textContent    = CLEAR_LINES[3].toLocaleString();
      document.getElementById('browris').textContent   = CLEAR_LINES[4].toLocaleString();

      if (giveup) {
        console.log('ギブアップ');
        const genbaneko = document.getElementById('giveup');
        genbaneko.style.display = 'inline-block';
      }
      console.log('経過時間:' + elapsed);
      console.log('クリアライン計:' + CLEAR_LINES[0].toLocaleString());
      console.log('シングル:' + CLEAR_LINES[1].toLocaleString());
      console.log('ダブル:' + CLEAR_LINES[2].toLocaleString());
      console.log('トリプル:' + CLEAR_LINES[3].toLocaleString());
      console.log('ブラウリス:' + CLEAR_LINES[4].toLocaleString());

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
            if (this.valid(-1, 0)) this.mino.x--;
            break;
          case 39: // 右
            if (this.valid(1, 0)) this.mino.x++;
            break;
          case 40: // 下
            if (this.valid(0, 1)) this.mino.y++;
            break;
          case 38: // 上
            if (this.valid(0, 0, 1)) this.mino.rotate();
            break;
          case 32: // スペース
            if (this.valid(0, 0, 1)) this.mino.rotate();
            break;
          case 71: // G
            this.gameOver(true);
            break;
        };
        this.mino.draw();
      }.bind(this);
    }

    /**
     * タッチイベント
     */
    setTouchEvent()
    {
      document.body.addEventListener('touchstart', e => {
        this.touchInfo(e.changedTouches);
      }, false);
    }

    /**
     * タッチイベント処理
     */
    touchInfo(touchList)
    {
      for (let i = 0; i < touchList.length ; i++ ) {

        const cx = touchList[i].clientX;
        const cy = touchList[i].clientY;

        if (cx < this.cw * 0.2 && cy < this.ch * 0.1) {
          // 左上(ギブアップ)
          this.gameOver(true);
        } else if (cx < this.cw * 0.3) {
          // 左
          if (this.valid(-1, 0)) this.mino.x--;
          this.mino.draw();
        } else if (cx > this.cw * 0.7) {
          // 右
          if (this.valid(1, 0)) this.mino.x++;
          this.mino.draw();
        } else if (cy < this.ch * 0.6) {
          // 上(回転)
          if (this.valid(0, 0, 1)) this.mino.rotate();
          this.mino.draw();
        } else {
          // 下
          if (this.valid(0, 1)) this.mino.y++;
          this.mino.draw();
        }
      }
    }
  }

  /**
   * ブロッククラス
   */
  class Block
  {
    // 基準地点からの座標
    // 移動中 ⇒ Minoの左上
    // 配置後 ⇒ Fieldの左上
    constructor(x, y, type)
    {
      this.x = x;
      this.y = y;

      // ID(10桁連番)
      BLOCK_NUM++;
      BLOCK_NUM = BLOCK_NUM > 9999999999 ? 1 : BLOCK_NUM;
      this.id = ('0000000000' + BLOCK_NUM).slice(-10);

      // 描画しないときはタイプを指定しない
      if (type >= 0) {
        this.setType(type);
      }
    }

    /**
     * タイプセット＆SVGタグ生成
     */
    setType(type)
    {
      this.type = type;

      // SVGタグ生成(実際の描写前)
      document.querySelector('body').insertAdjacentHTML('beforeend',
          '<svg id="block-' + this.id + '" viewBox="0 0 16 16"'
        + ' style="width: ' + BLOCK_SIZE + 'px; height: ' + BLOCK_SIZE + 'px;'
        + ' opacity: 1; position: fixed; z-index: 10002; fill: ' + BLOCK_COLORS[this.type] + ';'
        + ' display: none;">'
        + '<use xlink:href="#orgblock"></use>'
        + '</svg>'
      );

      this.svg = document.getElementById('block-' + this.id);
    }

    /**
     * Minoの表示
     * Minoに属するときは、Minoの位置をオフセットに指定
     * Fieldに属するときは、(0,0)を起点とするので不要
     */
    draw(offsetX = 0, offsetY = 0)
    {
      let drawX = this.x + offsetX
      let drawY = this.y + offsetY

      if (drawX >= 0 && drawX < COLS_COUNT &&
          drawY >= 0 && drawY < ROWS_COUNT) {
        // 画面内
        this.svg.style.left    = Math.floor(drawX * BLOCK_SIZE) + 'px';
        this.svg.style.top     = Math.floor(drawY * BLOCK_SIZE) + 'px';

        if (this.svg.style.display == 'none') {
          this.svg.style.display = 'inline-block';
        }
      } else {
        // 画面外
        this.svg.style.display = 'none';
      }
    }

    /**
     * 次のミノを描画する
     */
    drawNext()
    {
      // タイプごとに余白を調整して、中央に表示
      let offsetX = 0
      let offsetY = 0

      switch(this.type){
        case 0: // I型
          offsetX =  0.25;
          offsetY = -0.2;
          break;
        case 1: // O型
          offsetX = 0.35;
          offsetY = 0.3;
          break;
        case 9: // .型
          offsetX = 0.9;
          offsetY = 0.7;
          break;
        default:
          offsetX = 0.9;
          offsetY = 0.3;
          break;
      }

      this.svg.style.left    = NEXT_CR['x'] + Math.floor((this.x + offsetX) * BLOCK_SIZE) + 'px';
      this.svg.style.top     = NEXT_CR['y'] + Math.floor((this.y + offsetY) * BLOCK_SIZE) + 'px';
      this.svg.style.display = 'inline-block';
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
   * ミノクラス
   */
  class Mino
  {
    constructor()
    {
      // ミノ型決定
      if (EX_MODE) {
        // 拡張モード(拡張ミノは10%)
        if (Math.floor(Math.random() * 100) < 10) {
          if (Math.floor(Math.random() * 100) < 8) {
            // ビックリミノ(0.8%) type:10
            this.type = EXCLAMATION_TYPE;
          } else {
            // 拡張ミノ(各3.07%) type:7-9
            this.type = 7 + Math.floor(Math.random() * 3);
          }
        } else {
          // 通常ミノ(各12.86%) type:0-6
          this.type = Math.floor(Math.random() * 7);
        }
      } else {
        // 通常モード(各14.29%) type:0-6
        this.type = Math.floor(Math.random() * 7);
      }

      // ミノ生成
      this.initBlocks();
    }

    /**
     * ミノ生成
     */
    initBlocks()
    {
      const t = this.type;
      switch (t) {
        case 0: // I型
          this.blocks = [new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t), new Block(3, 2, t)];
          break;
        case 1: // O型
          this.blocks = [new Block(1, 1, t), new Block(2, 1, t), new Block(1, 2, t), new Block(2, 2, t)];
          break;
        case 2: // T型
          this.blocks = [new Block(1, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t)];
          break;
        case 3: // J型
          this.blocks = [new Block(0, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t)];
          break;
        case 4: // L型
          this.blocks = [new Block(2, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t)];
          break;
        case 5: // S型
          this.blocks = [new Block(1, 1, t), new Block(2, 1, t), new Block(0, 2, t), new Block(1, 2, t)];
          break;
        case 6: // Z型
          this.blocks = [new Block(0, 1, t), new Block(1, 1, t), new Block(1, 2, t), new Block(2, 2, t)];
          break;
        case 7: // U型
          this.blocks = [new Block(0, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t), new Block(2, 1, t)];
          break;
        case 8: // V型
          this.blocks = [new Block(0, 1, t), new Block(1, 2, t), new Block(2, 1, t)];
          break;
        case 9: // .型
          this.blocks = [new Block(1, 1, t)];
          break;
        case 10: // ビックリ型
          this.blocks = [];
          for (let i = 0; i < COLS_COUNT; i++) {
            if (i !== Math.floor(COLS_COUNT / 2)) {
              this.blocks.push(new Block(i, 2, t));
            }
          }
          break;
      };
    }

    /**
     * フィールドに生成する
     */
    spawn()
    {
      if (this.type === EXCLAMATION_TYPE) {
        // ビックリ型
        this.x = 0;
      } else if (RAND_MODE) {
        // ランダム位置モードはランダム
        this.x = Math.floor(Math.random() * (COLS_COUNT - 3));
      } else {
        // 中央
        this.x = Math.floor(COLS_COUNT / 2) - 2
      }

      this.y = -3
    }

    /**
     * フィールドに描画する
     */
    draw()
    {
      this.blocks.forEach(block => {
        block.draw(this.x, this.y)
      })
    }

    /**
     * 次のミノを描画する
     */
    drawNext()
    {
      if (this.type === EXCLAMATION_TYPE) {
        // ビックリ型
        this.drawExcNext();
      } else {
        this.blocks.forEach(block => {
          block.drawNext()
        });
      }
    }

    /**
     * 次ミノ ビックリマーク
     */
    drawExcNext()
    {
      if (document.getElementById('exclamation-mark')) {
        return;
      }

      const x = NEXT_CR['x'] + Math.floor(BLOCK_SIZE * 0.5);
      const y = NEXT_CR['y'] + Math.floor(BLOCK_SIZE * 0.5);

      document.querySelector('body').insertAdjacentHTML('beforeend',
          '<svg id="exclamation-mark" viewBox="0 0 512 512"'
        + ' style="width: ' + (BLOCK_SIZE * 3.5) + 'px; height: ' + (BLOCK_SIZE * 3.5) + 'px;'
        + ' left: ' + x + 'px; top: ' + y + 'px;'
        + ' opacity: 1; position: fixed; z-index: 10002;'
        + ' display: inline-block;">'
        + '<use xlink:href="#orgexc"></use>'
        + '</svg>'
      );
    }

    /**
     * 次ミノ ビックリマーク削除
     */
    removeExc()
    {
      const exc = document.getElementById('exclamation-mark');
      if (exc) {
        exc.remove();
      }
    }

    /**
     * 回転させる
     */
    rotate()
    {
      this.blocks.forEach(block => {
        let oldX = block.x
        block.x = block.y
        block.y = 3 - oldX
      })
    }

    /**
     * 次に移動しようとしている位置の情報を持ったミノを生成
     */
    getNewBlocks(moveX, moveY, rot)
    {
      let newBlocks = this.blocks.map(block => {
        return new Block(block.x, block.y);
      });

      newBlocks.forEach(block => {
        // 移動させる場合
        if (moveX || moveY) {
          block.x += moveX;
          block.y += moveY;
        }

        // 回転させる場合
        if (rot) {
          let oldX = block.x;
          block.x  = block.y;
          block.y  = 3 - oldX;
        }

        // グローバル座標に変換
        block.x += this.x;
        block.y += this.y;
      });

      return newBlocks;
    }
  }

  /**
   * 描写フィールドクラス
   */
  class Field
  {
    constructor()
    {
      this.blocks = [];
    }

    /**
     * SVGタグの削除＆新座標セット
     */
    checkLine()
    {
      let cLines = 0;
      for (let r = 0; r < ROWS_COUNT; r++) {
        const c = this.blocks.filter(block => block.y === r).length;

        if (c === COLS_COUNT) {
          cLines++;

          // SVG削除
          this.blocks.filter(block => {
            if (block.y == r) {
              block.remove();
            }
          });

          // ブロックオブジェクト削除
          this.blocks = this.blocks.filter(block => block.y !== r);

          // 削除した行より上のブロックを1行下にずらす
          this.blocks.filter(block => block.y < r).forEach(upper => {
            upper.y++;
            upper.draw();
          });
        }
      }

      // クリア行数更新
      if (cLines > 0) {
        CLEAR_LINES[0] += cLines; // 計
        CLEAR_LINES[cLines]++;    // 個別
        this.updateInfo();
      }
    }

    /**
     * 情報モーダル更新
     */
    updateInfo()
    {
      document.getElementById('clear-lines').textContent = CLEAR_LINES[0].toLocaleString();
    }

    /**
     * 固定ブロック存在チェック
     */
    has(x, y)
    {
      return this.blocks.some(block => block.x == x && block.y == y);
    }
  }

  // ゲーム開始
  const brGame = new Game();
  brGame.start();
}());
