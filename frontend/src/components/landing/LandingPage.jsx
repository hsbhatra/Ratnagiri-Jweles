import { Helmet } from 'react-helmet-async'
import HeroScene from '../../sections/landing/HeroScene'
import OutInTheWorldScene from '../../sections/landing/OutInTheWorldScene'
import CloserLookScene from '../../sections/landing/CloserLookScene'
import StoneToSettingScene from '../../sections/landing/StoneToSettingScene'
import CollectionsScene from '../../sections/landing/CollectionsScene'
import PromiseScene from '../../sections/landing/PromiseScene'
import CtaFooterScene from '../../sections/landing/CtaFooterScene'
import AccountLink from './AccountLink'

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>RatnaGiri Jewels — Handcrafted Jewellery</title>
        <meta
          name="description"
          content="Handcrafted jewellery with premium stones and timeless design, worn in everyday life."
        />
      </Helmet>
      <AccountLink />
      <main>
        <HeroScene />
        <OutInTheWorldScene />
        <CloserLookScene />
        <StoneToSettingScene />
        <CollectionsScene />
        <PromiseScene />
        <CtaFooterScene />
      </main>
    </>
  )
}
