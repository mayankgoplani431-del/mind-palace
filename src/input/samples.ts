import type { Lang } from '../extract/types';

export interface SampleNotes {
  id: string;
  lang: Lang;
  label: Record<Lang, string>;
  text: string;
}

const physics = `# Physics Basics

## Motion and Forces
- **Newton's First Law**: An object at rest stays at rest, and a moving object keeps moving at constant velocity, unless a net force acts on it.
- **Inertia**: The tendency of an object to resist any change in its motion; heavier objects have more inertia.
- **Newton's Second Law**: Force equals mass times acceleration, so the same push accelerates a light object more than a heavy one.
- **Rocket Propulsion**: A rocket lifts off because of Newton's Third Law, as hot gas thrown downward pushes the rocket up.
- **Gravity**: The attractive force between masses that keeps every planet in orbit around the Sun and pulls objects toward Earth.
- **Friction**: A force that opposes motion between two surfaces in contact and turns motion into heat.
- **Momentum**: Mass multiplied by velocity; in a collision the total momentum of a closed system is conserved.
- **Simple Pendulum**: A weight on a string swings with a steady period that depends on the length of the string, not on the mass.

## Energy and Waves
- **Kinetic Energy**: The energy of motion, equal to half the mass times the velocity squared.
- **Potential Energy**: Stored energy due to position, such as a stretched spring or a rock at the top of a mountain.
- **Conservation of Energy**: Energy can never be created or destroyed, it only changes from one form to another.
- **Hooke's Law**: The force of a spring is proportional to how far it is stretched or compressed.
- **Wave**: A disturbance that carries energy from place to place without carrying matter; it has wavelength, frequency and amplitude.
- **Sound**: A wave of vibrating air that needs a medium and cannot travel through empty space.
- **Light and Prism**: White light splits into a rainbow of colours when it passes through a glass prism because each colour bends differently.
- **Power**: The rate of doing work, measured in watts, where one watt equals one joule per second.

## Electricity and Magnetism
- **Atom**: The basic unit of matter, made of a nucleus of protons and neutrons with electrons orbiting around it.
- **Electric Current**: The flow of electric charge through a conductor, measured in amperes.
- **Battery**: A device that stores chemical energy and converts it into electrical energy to push current around a circuit.
- **Ohm's Law**: Voltage equals current times resistance, so a higher resistance lets less current flow.
- **Light Bulb**: A bulb glows when current heats its thin filament, and it lights up only when the circuit is closed.
- **Magnet**: A material that attracts iron and has a north and a south pole; opposite poles attract and like poles repel.
- **Electromagnet**: A coil of wire around an iron core that becomes a magnet only while current flows through it.
- **Lightning**: A giant spark of static electricity that jumps between clouds and the ground in a flash of light.
`;

const biology = `# जीव विज्ञान की मूल बातें

## कोशिका और आनुवंशिकता
- कोशिका: जीवन की मूल इकाई, जिसमें जीवन की सभी क्रियाएँ होती हैं।
- केंद्रक: कोशिका का नियंत्रण केंद्र, जिसमें डीएनए सुरक्षित रहता है।
- डीएनए: दोहरी कुंडली जैसा अणु जो आनुवंशिक जानकारी को एक पीढ़ी से दूसरी पीढ़ी तक पहुँचाता है।
- माइटोकॉन्ड्रिया: कोशिका का ऊर्जा घर, जो भोजन से ऊर्जा बनाता है।
- गुणसूत्र: केंद्रक में मौजूद धागे जैसी संरचनाएँ, जिन पर जीन स्थित होते हैं।
- कोशिका झिल्ली: कोशिका को घेरने वाली पतली परत जो तय करती है कि कौन-सा पदार्थ अंदर या बाहर जाए।
- जीन: आनुवंशिकता की इकाई, जो माता-पिता के लक्षण संतान तक पहुँचाती है।
- प्रोटीन: शरीर की वृद्धि और मरम्मत के लिए ज़रूरी पोषक तत्व, जो दाल, दूध और अंडे से मिलता है।

## पौधे और प्रकाश संश्लेषण
- प्रकाश संश्लेषण: वह प्रक्रिया जिसमें पौधे सूर्य के प्रकाश, जल और कार्बन डाइऑक्साइड से अपना भोजन बनाते हैं।
- क्लोरोफिल: पत्तियों में मौजूद हरा वर्णक जो सूर्य के प्रकाश को सोखता है।
- पत्ती: पौधे का भोजन बनाने वाला मुख्य अंग, जिस पर छोटे-छोटे रंध्र होते हैं।
- जड़: पौधे को मिट्टी में टिकाए रखती है और जल तथा खनिज लवण सोखती है।
- वृक्ष: लंबा और मज़बूत तने वाला पौधा, जो हमें छाया, फल और ऑक्सीजन देता है।
- फूल: पौधे का प्रजनन अंग, जो परागण के बाद फल और बीज बनाता है।
- वाष्पोत्सर्जन: पत्तियों के रंध्रों से जलवाष्प के रूप में पानी बाहर निकलने की क्रिया।
- ऑक्सीजन: प्रकाश संश्लेषण के दौरान निकलने वाली गैस, जिसे सभी जीव साँस लेने में उपयोग करते हैं।

## मानव शरीर
- हृदय: मुट्ठी के आकार का पेशीय अंग जो पूरे शरीर में रक्त को पंप करता है।
- मस्तिष्क: शरीर का नियंत्रण केंद्र जो सोचने, याददाश्त और सभी अंगों के काम को संभालता है।
- आँख: देखने का अंग, जिसके रेटिना पर वस्तुओं का उल्टा प्रतिबिंब बनता है।
- फेफड़े: साँस लेने के अंग, जहाँ ऑक्सीजन रक्त में जाती है और कार्बन डाइऑक्साइड बाहर निकलती है।
- रक्त: लाल तरल पदार्थ जो ऑक्सीजन और पोषक तत्व पूरे शरीर तक पहुँचाता है।
- पाचन तंत्र: वह तंत्र जो भोजन को तोड़कर उसके पोषक तत्वों को रक्त में पहुँचाता है।
- प्रतिरक्षा तंत्र: शरीर की रक्षा पंक्ति, जो रोग फैलाने वाले कीटाणुओं से लड़ती है।
- हड्डी: शरीर को ढाँचा और सुरक्षा देने वाला कठोर अंग, जिसमें कैल्शियम भरपूर होता है।
`;

const history = `# मराठा इतिहास

## शिवाजी महाराज आणि स्वराज्य
- रायगड: शिवाजी महाराजांची राजधानी असलेला अभेद्य डोंगरी किल्ला.
- राज्याभिषेक: १६७४ मध्ये रायगडावर शिवाजी महाराजांना छत्रपतींचे सिंहासन मिळाले.
- स्वराज्य: परकीय सत्तेपासून मुक्त, स्वतःचे राज्य निर्माण करण्याचे शिवाजी महाराजांचे स्वप्न.
- आरमार: शिवाजी महाराजांनी कोकण किनारपट्टीच्या रक्षणासाठी उभारलेले युद्धनौकांचे दल.
- अफजलखान वध: १६५९ मध्ये प्रतापगडाच्या पायथ्याशी शिवाजी महाराजांनी वाघनखांनी अफजलखानाचा वध केला.
- अष्टप्रधान मंडळ: राज्यकारभार चालवण्यासाठी नेमलेले आठ मंत्र्यांचे मंडळ.
- गनिमी कावा: कमी सैन्यासह अचानक हल्ला करून शत्रूला हरवण्याचे युद्धतंत्र.
- पुरंदरचा तह: १६६५ मध्ये शिवाजी महाराज आणि मिर्झाराजे जयसिंग यांच्यात झालेला तह.

## पेशवे आणि मराठा साम्राज्य
- पेशवा: छत्रपतींचा मुख्य प्रधान, जो पुढे मराठा साम्राज्याचा खरा कारभारी बनला.
- बाजीराव पहिले: अजिंक्य सेनापती म्हणून प्रसिद्ध असलेले पेशवे, ज्यांनी उत्तर भारतात मराठ्यांची सत्ता पसरवली.
- शनिवारवाडा: पुण्यातील पेशव्यांचा भव्य राजवाडा आणि सत्ताकेंद्र.
- पानिपतची लढाई: १७६१ मध्ये अहमदशाह अब्दालीविरुद्ध झालेली भीषण लढाई, ज्यात मराठ्यांचा पराभव झाला.
- तोफ: मराठ्यांच्या सैन्यातील तोफखाना, जो किल्ल्यांच्या संरक्षणासाठी आणि लढाईसाठी वापरला जाई.
- चौथ आणि सरदेशमुखी: मराठ्यांना इतर प्रदेशांकडून मिळणारे कर.
- अहिल्याबाई होळकर: इंदूरच्या न्यायप्रिय राज्यकर्त्या, ज्यांनी अनेक मंदिरे आणि घाट बांधले.
- तंजावरचे मराठे: दक्षिण भारतात व्यंकोजीराजांनी स्थापन केलेले मराठ्यांचे राज्य.

## स्वातंत्र्य लढा
- बाळ गंगाधर टिळक: लोकमान्य टिळकांनी "स्वराज्य हा माझा जन्मसिद्ध हक्क आहे" अशी घोषणा दिली.
- केसरी: टिळकांनी सुरू केलेले वृत्तपत्र, ज्याने ब्रिटिशांविरुद्ध जनजागृती केली.
- महात्मा गांधी: अहिंसा आणि सत्याग्रहाच्या मार्गाने भारताला स्वातंत्र्य मिळवून देणारे नेते.
- दांडी यात्रा: १९३० मध्ये मीठ कायद्याच्या विरोधात गांधींनी काढलेली पदयात्रा.
- चले जाव चळवळ: १९४२ मध्ये ब्रिटिशांनी भारत सोडावा म्हणून सुरू झालेले आंदोलन.
- तिरंगा: भारताचा राष्ट्रध्वज, जो केशरी, पांढरा आणि हिरव्या रंगांचा आहे.
- संविधान: भारताचे सर्वोच्च कायदेशीर दस्तऐवज, जे २६ जानेवारी १९५० पासून लागू झाले.
- स्वातंत्र्य दिन: १५ ऑगस्ट १९४७ रोजी भारत ब्रिटिश सत्तेतून स्वतंत्र झाला.
`;

export const SAMPLES: SampleNotes[] = [
  {
    id: 'physics-en',
    lang: 'en',
    label: { en: 'Physics (English)', hi: 'भौतिकी (अंग्रेज़ी)', mr: 'भौतिकशास्त्र (इंग्रजी)' },
    text: physics,
  },
  {
    id: 'biology-hi',
    lang: 'hi',
    label: { en: 'Biology (Hindi)', hi: 'जीव विज्ञान (हिंदी)', mr: 'जीवशास्त्र (हिंदी)' },
    text: biology,
  },
  {
    id: 'history-mr',
    lang: 'mr',
    label: { en: 'History (Marathi)', hi: 'इतिहास (मराठी)', mr: 'इतिहास (मराठी)' },
    text: history,
  },
];
