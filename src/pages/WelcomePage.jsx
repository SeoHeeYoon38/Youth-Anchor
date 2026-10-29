import { useNavigate } from 'react-router-dom'

const WARM_ASSET_ROOT = '/figma/warm'
const WELCOME_SPARKLES = [
  ['8%', '19%', '4px', '-1.6s', '4.8s', '-8px', '-18px'],
  ['18%', '34%', '7px', '-3.2s', '6.2s', '7px', '-24px'],
  ['26%', '12%', '5px', '-.8s', '4.4s', '-4px', '-16px'],
  ['38%', '24%', '3px', '-2.7s', '5.1s', '5px', '-20px'],
  ['52%', '9%', '4px', '-2s', '4.9s', '-6px', '-18px'],
  ['65%', '17%', '7px', '-2.4s', '5.7s', '9px', '-22px'],
  ['79%', '29%', '4px', '-4.1s', '6.4s', '-6px', '-20px'],
  ['91%', '20%', '6px', '-1.1s', '5.3s', '7px', '-21px'],
  ['10%', '58%', '6px', '-2.8s', '5.4s', '8px', '-26px'],
  ['20%', '76%', '4px', '-.3s', '4.6s', '-5px', '-17px'],
  ['33%', '67%', '3px', '-2.1s', '5.2s', '6px', '-19px'],
  ['57%', '78%', '4px', '-3.4s', '4.8s', '-7px', '-20px'],
  ['71%', '69%', '5px', '-3.7s', '6s', '6px', '-23px'],
  ['84%', '57%', '7px', '-1.2s', '5.2s', '-9px', '-25px'],
  ['94%', '73%', '4px', '-2.1s', '4.9s', '5px', '-16px'],
  ['14%', '46%', '5px', '-4.4s', '6.1s', '-5px', '-22px'],
  ['31%', '44%', '8px', '-1.4s', '5.6s', '7px', '-24px'],
  ['47%', '55%', '5px', '-3.9s', '5s', '-7px', '-18px'],
  ['63%', '43%', '6px', '-.5s', '5.8s', '8px', '-25px'],
  ['76%', '83%', '5px', '-2.9s', '5.3s', '-6px', '-19px'],
  ['89%', '42%', '8px', '-1.8s', '6.3s', '7px', '-27px']
]

export default function WelcomePage({ onQuickExit }) {
  const navigate = useNavigate()

  const startHaven = () => {
    sessionStorage.setItem('haven-welcomed', 'yes')
    navigate('/home')
  }

  return (
    <div className="welcome-screen page-enter">
      <header className="welcome-header">
        <div className="welcome-brand">
          <span className="welcome-brand-mark" aria-hidden="true">
            <img src={`${WARM_ASSET_ROOT}/welcome-shield.svg`} alt="" />
          </span>
          <strong>HAVEN</strong>
        </div>
        <div className="welcome-header-actions">
          <button className="welcome-bell" type="button" aria-label="알림 안내">
            <img src={`${WARM_ASSET_ROOT}/welcome-bell.svg`} alt="" />
          </button>
          <button className="welcome-exit" type="button" onClick={onQuickExit}>
            <img src={`${WARM_ASSET_ROOT}/welcome-power.svg`} alt="" />
            긴급종료
          </button>
        </div>
      </header>

      <section className="welcome-copy reveal-stack">
        <span>설치 없이 바로 만나는 안전한 공간</span>
        <h1>어서 와!<br />너의 든든한 친구<br /><strong>‘가온’</strong>이야.</h1>
        <p>위기청소년과 자립준비청년을 위한 흔적<br />없는 통합 지원 서비스예요.</p>
      </section>

      <div className="welcome-visual">
        <div className="welcome-glow" aria-hidden="true" />
        <div className="welcome-sparkles" aria-hidden="true">
          {WELCOME_SPARKLES.map(([left, top, size, delay, duration, driftX, driftY], index) => (
            <i
              key={`${left}-${top}`}
              style={{
                '--sparkle-left': left,
                '--sparkle-top': top,
                '--sparkle-size': size,
                '--sparkle-delay': delay,
                '--sparkle-duration': duration,
                '--sparkle-drift-x': driftX,
                '--sparkle-drift-y': driftY
              }}
              data-sparkle={index + 1}
            />
          ))}
        </div>
        <img
          className="welcome-mascot-image"
          src={`${WARM_ASSET_ROOT}/welcome-mascot.png`}
          alt="등불을 들고 반갑게 인사하는 가온"
        />
      </div>

      <button className="welcome-start transition active:scale-[0.98]" onClick={startHaven}>
        Haven 시작하기
      </button>
    </div>
  )
}
