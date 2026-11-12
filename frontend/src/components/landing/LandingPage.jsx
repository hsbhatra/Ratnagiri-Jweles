import { Helmet } from 'react-helmet-async'
import HeroScene from '../../sections/landing/HeroScene'
import StonesScene from '../../sections/landing/StonesScene'
import CloserLookScene from '../../sections/landing/CloserLookScene'
import StoneToSettingScene from '../../sections/landing/StoneToSettingScene'
import CollectionsScene from '../../sections/landing/CollectionsScene'
import PromiseScene from '../../sections/landing/PromiseScene'
import CtaFooterScene from '../../sections/landing/CtaFooterScene'
import SiteHeader from '../SiteHeader'

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>RatnaGiri Jewels | Handcrafted Jewellery</title>
        <meta
          name="description"
          content="Handcrafted jewellery with premium stones and timeless design, worn in everyday life."
        />
      </Helmet>
      <SiteHeader overlay />
      <main>
        <HeroScene />
        <StonesScene />
        <CollectionsScene />
        <StoneToSettingScene />
        <CloserLookScene />
        <PromiseScene />
        <CtaFooterScene />
      </main>
    </>
  )
}
