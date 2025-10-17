import { View } from 'react-native';
import AnimatedSegmentedTabs from 'components/AnimatedSegmentedTabs';
import QRCode1Icon from 'assets/QRCode1Icon';
import QRCode2Icon from 'assets/QRCode2Icon';

const ScanIcon = ({ isActive }: { isActive: boolean }) => <QRCode1Icon isActive={isActive} />;

const MyQrIcon = ({ isActive }: { isActive: boolean }) => <QRCode2Icon isActive={isActive} />;

type Props = {
  activeTab: 'scan' | 'myqr';
  setActiveTab: (tab: 'scan' | 'myqr') => void;
};

export default function QrTabSwitch({ activeTab, setActiveTab }: Props) {
  return (
    <View>
      <AnimatedSegmentedTabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'scan' | 'myqr')}
        tabs={[
          { key: 'scan', label: 'Scan QR', icon: ScanIcon },
          { key: 'myqr', label: 'My QR', icon: MyQrIcon },
        ]}
        activeColor="black"
        inactiveColor="#929393"
      />
    </View>
  );
}
