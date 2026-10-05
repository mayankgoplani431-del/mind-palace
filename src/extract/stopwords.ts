import type { Lang } from './types';

const EN =
  'a about above after again against all also am an and any are aren as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves also however therefore thus hence may might must shall upon within without often usually called known such many much one two three first second third via per etc eg ie e.g i.e';

const HI =
  'और का की के को से में पर है हैं था थी थे हो होता होती होते हुआ हुई हुए कर करता करती करते किया किये गया गई गए जा जाता जाती जाते यह वह ये वे इस उस इन उन एक भी ही तो न नहीं या कि जो जिस जिन जिसमें जिसे तथा एवं लेकिन परंतु किंतु अपने अपना अपनी उनके उनकी उनका इसके इसकी इसका उसके उसकी उसका लिए साथ द्वारा बाद पहले कुछ सभी सब बहुत अधिक कम जब तब जहाँ वहाँ यहाँ कैसे क्या क्यों कौन कहते कहा कहलाता कहलाती सकता सकती सकते चाहिए रहा रही रहे दिया दी दिए लिया ली लिए वाला वाली वाले तक अब फिर भी कारण ऐसे ऐसा ऐसी जैसे जैसा वैसे इसलिए क्योंकि हुआ होने करने जाने देना लेना दो तीन';

const MR =
  'आणि चा ची चे च्या ला ना ने नी त्या त्याचे त्याची त्याचा त्यांचे त्यांची त्यांचा त्यांनी त्याने तिने हे हा ही ते तो ती या ह्या तर पण किंवा परंतु आहे आहेत होते होती होता झाले झाली झाला केले केली केला करतात करते करतो असे असते असतात असतो म्हणजे म्हणून म्हणतात मध्ये वर खाली आत बाहेर पासून पर्यंत साठी कडे कडून सर्व काही अनेक खूप जास्त कमी जेव्हा तेव्हा जिथे तिथे येथे तेथे कसे काय का कोण नाही नाहीत शकते शकतो शकतात पाहिजे लागते लागतो नंतर आधी तसेच सुद्धा देखील फक्त केवळ एक दोन तीन कारण म्हणूनच जो जी जे ज्या ज्याला तसा तशी तसे असा अशी असे येते जाते गेले गेला गेली दिले दिली घेतले घेतली होणे करणे देणे येणे जाणे';

function toSet(s: string): Set<string> {
  return new Set(s.split(/\s+/).filter(Boolean));
}

export const STOPWORDS: Record<Lang, Set<string>> = { en: toSet(EN), hi: toSet(HI), mr: toSet(MR) };
