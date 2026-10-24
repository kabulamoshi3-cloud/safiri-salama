import React, { useState } from 'react';
import { FaShieldAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const HelpPage: React.FC = () => {
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const faqSections = [
    {
      title: 'For Passengers',
      questions: [
        {
          question: 'How do I book a ride?',
          answer:
            'Open the DalaSmart app, enter your destination, choose your ride type (Car, Bajaji, or Boda Boda), and confirm. A nearby driver will be assigned to pick you up.',
        },
        {
          question: 'How do I cancel a ride?',
          answer:
            'You can cancel a ride from the app before the driver arrives. Note that cancellation fees may apply if the driver is already on their way to your location.',
        },
        {
          question: 'Can I pay with M-Pesa?',
          answer:
            'Yes! We accept M-Pesa, Tigopesa, and other mobile money options. You can also pay with cash if preferred.',
        },
        {
          question: "What if my driver doesn't show up?",
          answer:
            "If your driver doesn't arrive within the estimated time, contact our 24/7 support through the app or call +255 700 000 000. We'll help you resolve the issue immediately.",
        },
      ],
    },
    {
      title: 'For Drivers',
      questions: [
        {
          question: 'How do I accept rides?',
          answer:
            "Once you're online in the driver app, you'll receive ride requests nearby. Review the pickup location and destination, then accept or decline. Accepted rides will provide navigation guidance.",
        },
        {
          question: 'How are earnings calculated?',
          answer:
            'You earn based on distance traveled and time spent on each trip. DalaSmart takes a 20% commission, and you receive weekly payouts to your mobile money account. All earnings are tracked in the app.',
        },
        {
          question: 'How do I rate passengers?',
          answer:
            "After completing a trip, you'll be prompted to rate the passenger from 1 to 5 stars. You can also leave comments to help other drivers.",
        },
      ],
    },
    {
      title: 'Safety',
      questions: [
        {
          question: 'Is there an SOS button?',
          answer:
            'Yes, both passengers and drivers have access to an in-app SOS button that immediately alerts our safety team and local emergency services if activated.',
        },
        {
          question: 'How are drivers verified?',
          answer:
            'All drivers undergo background checks, license verification, and vehicle inspections before joining DalaSmart. We continuously monitor ratings and safety compliance.',
        },
        {
          question: 'What happens in an emergency?',
          answer:
            'Use the SOS button in the app, or call our emergency line at +255 800 000 000. We work with local authorities to ensure fast response times. All trips are GPS-tracked for safety.',
        },
      ],
    },
    {
      title: 'Payments',
      questions: [
        {
          question: 'What payment methods are accepted?',
          answer:
            'We accept M-Pesa, Tigopesa, Airtel Money, and cash. You can set your preferred payment method in the app settings.',
        },
        {
          question: 'When will I be charged?',
          answer:
            "You're charged at the end of your ride. If paying with mobile money, the amount is deducted automatically. If paying with cash, pay the driver directly.",
        },
        {
          question: 'How do I get a receipt?',
          answer:
            'A digital receipt is automatically sent to your email and available in the app under "Ride History" after each trip.',
        },
      ],
    },
  ];

  const safetyFeatures = [
    'GPS tracking on every ride',
    'Driver identity verification',
    'In-app SOS button',
    '24/7 safety monitoring',
    'Ride sharing with trusted contacts',
  ];

  const toggleSection = (index: number) => {
    if (openSection === index) {
      setOpenSection(null);
      setOpenQuestion(null);
    } else {
      setOpenSection(index);
      setOpenQuestion(null);
    }
  };

  const toggleQuestion = (index: number) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  return (
    <div>
      {/* Header Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Help & Safety Center</h1>
          <p className="text-xl max-w-3xl mx-auto">
            We're here to help you have a safe and smooth experience
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleSection(sectionIndex)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-100"
                >
                  <span className="text-xl font-bold text-primary">{section.title}</span>
                  {openSection === sectionIndex ? (
                    <FaChevronUp className="text-primary" />
                  ) : (
                    <FaChevronDown className="text-primary" />
                  )}
                </button>
                {openSection === sectionIndex && (
                  <div className="border-t">
                    {section.questions.map((item, questionIndex) => (
                      <div key={questionIndex} className="border-b last:border-b-0">
                        <button
                          onClick={() => toggleQuestion(questionIndex)}
                          className="w-full px-6 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold">{item.question}</span>
                          {openQuestion === questionIndex ? (
                            <FaChevronUp className="text-gray-400" />
                          ) : (
                            <FaChevronDown className="text-gray-400" />
                          )}
                        </button>
                        {openQuestion === questionIndex && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-700">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Safety Features
          </h2>
          <div className="bg-white rounded-xl shadow-md p-8">
            <ul className="space-y-4">
              {safetyFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <FaShieldAlt className="text-primary text-xl mr-4 flex-shrink-0 mt-1" />
                  <span className="text-lg">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Contact Support
          </h2>
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="space-y-6 text-lg">
              <div>
                <span className="font-semibold">Phone: </span>
                <a href="tel:+255700000000" className="text-primary hover:underline">
                  +255 700 000 000
                </a>
              </div>
              <div>
                <span className="font-semibold">Email: </span>
                <a
                  href="mailto:support@dalasmart.co.tz"
                  className="text-primary hover:underline"
                >
                  support@dalasmart.co.tz
                </a>
              </div>
              <div>
                <span className="font-semibold">WhatsApp: </span>
                <a
                  href="https://wa.me/255700000001"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +255 700 000 001
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Numbers Section */}
      <section className="py-16 bg-red-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-red-800">
            Emergency Numbers
          </h2>
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="space-y-4 text-lg">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="font-semibold">Police:</span>
                <a
                  href="tel:112"
                  className="text-red-600 hover:underline font-bold text-xl"
                >
                  112
                </a>
              </div>
              <div className="flex justify-between items-center border-b pb-3">
                <span className="font-semibold">Ambulance:</span>
                <a
                  href="tel:114"
                  className="text-red-600 hover:underline font-bold text-xl"
                >
                  114
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">DalaSmart Emergency:</span>
                <a
                  href="tel:+255800000000"
                  className="text-red-600 hover:underline font-bold text-xl"
                >
                  +255 800 000 000
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HelpPage;
