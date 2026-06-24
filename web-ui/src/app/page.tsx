import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Commands from "@/components/Commands";
import Premium from "@/components/Premium";
import About from "@/components/About";
import FAQ from "@/components/FAQ";
import Team from "@/components/Team";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Commands />
        <Premium />
        <About />
        <FAQ />
        <Team />
      </main>
      <Footer />
    </>
  );
}
