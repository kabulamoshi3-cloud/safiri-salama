import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaClock,
  FaDollarSign,
  FaMobileAlt,
  FaUsers,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import Button from '../components/Button';
import Card from '../components/Card';

const BecomeDriverPage: React.FC = () => {
  const [hours, setHours] = useState(40);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const benefits = [
    {
      icon: FaClock,
      title: 'Flexible Hours',
      description: 'Work when you want — set your own schedule',
    },
    {
      icon: FaDollarSign,
      title: 'Weekly Payouts',
      description: 'Get paid every week directly to your mobile money',
    },
    {
      icon: FaMobileAlt,
      title: 'App Support',
      description: 'Our app handles navigation and payments for you',
    },
    {
      icon: FaUsers,
      title: 'Community',
      description: 'Join thousands of drivers across Tanzania',
    },
  ];

  const requirements = [
    "Valid driver's license",
    'Vehicle not older than 2015',
    'Smartphone with Android 8+ or iOS 13+',
    'Background check clearance',
    'Proof of vehicle insurance',
  ];

  const applicationSteps = [
    'Sign up online',
    'Submit documents',
    'Vehicle inspection',
    'Start driving',
  ];

  const faqs = [
    {
      question: 'How much can I earn?',
      answer:
        'Earnings vary based on hours worked, location, and demand. On average, drivers earn around Sh 15,000 per hour before commission. Many full-time drivers earn over Sh 2 million per month.',
    },
    {
      question: 'What documents do I need?',
      answer:
        "You'll need a valid driver's license, vehicle registration, proof of insurance, and a smartphone. We'll also conduct a background check as part of the application process.",
    },
    {
      question: 'How does payment work?',
      answer:
        'You receive weekly payouts directly to your mobile money account (M-Pesa or Tigopesa). DalaSmart takes a 20% commission, and you keep the rest. All earnings are tracked transparently in the app.',
    },
    {
      question: 'Can I drive part-time?',
      answer:
        'Absolutely! Many of our drivers work part-time. You have complete control over when and how often you drive. Whether you want to drive a few hours a week or full-time, the choice is yours.',
    },
    {
      question: 'What if I have an accident?',
      answer:
        'Safety is our priority. All trips are covered by insurance. In case of an accident, contact our 24/7 support immediately. We provide guidance through the claims process and ensure you get the help you need.',
    },
    {
      question: 'How do I get support?',
      answer:
        'We offer 24/7 driver support via phone, WhatsApp, and in-app messaging. Our dedicated driver support team is always ready to help with any questions or issues you encounter.',
    },
  ];

  const monthlyEarnings = Math.round(hours * 48000);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Drive with DalaSmart
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Earn money on your schedule. Be your own boss.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Drive with Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <benefit.icon className="text-primary text-4xl mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Requirements
          </h2>
          <div className="bg-white rounded-xl shadow-md p-8">
            <ul className="space-y-4">
              {requirements.map((requirement, index) => (
                <li key={index} className="flex items-start">
                  <FaCheck className="text-primary text-xl mr-4 flex-shrink-0 mt-1" />
                  <span className="text-lg">{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Estimate Your Earnings
          </h2>
          <Card>
            <div className="mb-6">
              <label className="block text-lg font-semibold mb-4">
                Hours per week: {hours}
              </label>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>0 hrs</span>
                <span>80 hrs</span>
              </div>
            </div>
            <div className="text-center py-6 bg-primary text-white rounded-lg">
              <p className="text-lg mb-2">Estimated Monthly Earnings</p>
              <p className="text-4xl font-bold">
                Sh {monthlyEarnings.toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              After 20% platform commission. Actual earnings may vary based on location
              and demand.
            </p>
          </Card>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How to Get Started
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {applicationSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-secondary text-gray-900 rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {index + 1}
                </div>
                <p className="text-lg font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-semibold">{faq.question}</span>
                  {openFaq === index ? (
                    <FaChevronUp className="text-primary" />
                  ) : (
                    <FaChevronDown className="text-primary" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Join thousands of drivers who have already taken control of their income
          </p>
          <Link to="/register?role=driver">
            <Button variant="primary" className="text-lg px-12 py-4">
              Apply Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BecomeDriverPage;
