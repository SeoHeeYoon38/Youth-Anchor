export default function Mascot({ pose = 'basic', alt = '', className = '' }) {
  const accessibility = alt
    ? { role: 'img', 'aria-label': alt }
    : { 'aria-hidden': true }

  return <span className={`gaon-mascot gaon-${pose} ${className}`.trim()} {...accessibility} />
}
