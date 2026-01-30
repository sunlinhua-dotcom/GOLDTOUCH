import styles from "./page.module.css";
import SearchInput from "@/components/SearchInput";
import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <div className={styles.main}>
        <div className={styles.heroContent}>
          <div className={styles.logo}>MOJIN COMPUTE</div>
          <div className={styles.logoSub}>摸金算力</div>

          <SearchInput />

          <p className={styles.slogan}>AI DRIVEN INVESTMENT INSIGHT</p>
        </div>
      </div>
    </>
  );
}
