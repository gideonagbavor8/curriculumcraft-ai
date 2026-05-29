import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const CURRICULUM = [
  {
    subject: { name: "Mathematics", slug: "mathematics" },
    strands: [
      {
        name: "Number & Numeration",
        subStrands: [
          {
            name: "Whole Numbers & Place Value",
            indicators: [
              { code: "B7.1.1.1", text: "Identify, read and write numbers up to 1,000,000 in figures and words", bloomsLevel: "Remember", grade: "B7" },
              { code: "B7.1.1.2", text: "Round numbers to the nearest 10, 100, 1000, 10000 and 100000", bloomsLevel: "Understand", grade: "B7" },
            ],
          },
          {
            name: "Operations on Whole Numbers",
            indicators: [
              { code: "B7.1.2.1", text: "Add and subtract whole numbers and decimal numbers up to 4 significant figures", bloomsLevel: "Apply", grade: "B7" },
              { code: "B7.1.3.1", text: "Multiply and divide whole numbers by 2-digit numbers", bloomsLevel: "Apply", grade: "B7" },
              { code: "B8.1.1.1", text: "Apply order of operations (BODMAS) to evaluate expressions involving integers", bloomsLevel: "Apply", grade: "B8" },
              { code: "B8.1.2.1", text: "Convert between fractions, decimals and percentages", bloomsLevel: "Understand", grade: "B8" },
              { code: "B9.1.1.1", text: "Apply ratio and proportion to solve real-life problems", bloomsLevel: "Apply", grade: "B9" },
              { code: "B9.1.2.1", text: "Calculate simple and compound interest", bloomsLevel: "Apply", grade: "B9" },
            ],
          },
        ],
      },
      {
        name: "Algebra",
        subStrands: [
          {
            name: "Algebraic Expressions",
            indicators: [
              { code: "B7.2.1.1", text: "Use letters to represent unknown quantities and simplify algebraic expressions", bloomsLevel: "Understand", grade: "B7" },
              { code: "B7.2.2.1", text: "Solve simple linear equations with one unknown", bloomsLevel: "Apply", grade: "B7" },
              { code: "B8.2.1.1", text: "Expand and factorise algebraic expressions", bloomsLevel: "Apply", grade: "B8" },
              { code: "B8.2.2.1", text: "Solve linear inequalities and represent on a number line", bloomsLevel: "Apply", grade: "B8" },
            ],
          },
        ],
      },
      {
        name: "Geometry & Measurement",
        subStrands: [
          {
            name: "Shapes & Properties",
            indicators: [
              { code: "B7.3.1.1", text: "Identify and describe properties of 2D and 3D shapes", bloomsLevel: "Remember", grade: "B7" },
              { code: "B7.3.2.1", text: "Calculate perimeter and area of rectangles, triangles and circles", bloomsLevel: "Apply", grade: "B7" },
            ],
          },
        ],
      },
      {
        name: "Statistics & Probability",
        subStrands: [
          {
            name: "Data Handling",
            indicators: [
              { code: "B9.4.1.1", text: "Collect, organise and interpret data using frequency tables, bar charts and pie charts", bloomsLevel: "Analyse", grade: "B9" },
              { code: "B9.4.2.1", text: "Calculate mean, median and mode of a data set", bloomsLevel: "Apply", grade: "B9" },
            ],
          },
        ],
      },
    ],
  },
  {
    subject: { name: "Science", slug: "science" },
    strands: [
      {
        name: "Life Sciences",
        subStrands: [
          {
            name: "Cells & Living Things",
            indicators: [
              { code: "B7.1.1.1-SC", text: "Identify and describe the basic structures and functions of plant and animal cells", bloomsLevel: "Understand", grade: "B7" },
              { code: "B7.1.2.1-SC", text: "Explain photosynthesis and respiration in plants", bloomsLevel: "Understand", grade: "B7" },
              { code: "B8.1.1.1-SC", text: "Describe the human digestive system and the role of enzymes", bloomsLevel: "Understand", grade: "B8" },
              { code: "B8.1.2.1-SC", text: "Explain reproduction in plants: pollination, fertilisation and seed dispersal", bloomsLevel: "Understand", grade: "B8" },
            ],
          },
        ],
      },
      {
        name: "Physical Sciences",
        subStrands: [
          {
            name: "Matter & Materials",
            indicators: [
              { code: "B8.2.1.1-SC", text: "Describe the properties and uses of materials: metals, non-metals and alloys", bloomsLevel: "Understand", grade: "B8" },
              { code: "B8.2.2.1-SC", text: "Explain the water cycle and its importance to life on Earth", bloomsLevel: "Understand", grade: "B8" },
              { code: "B9.2.1.1-SC", text: "Apply Newton's Laws of Motion to everyday situations", bloomsLevel: "Apply", grade: "B9" },
              { code: "B9.2.2.1-SC", text: "Explain electrical circuits: series and parallel, voltage, current and resistance", bloomsLevel: "Understand", grade: "B9" },
            ],
          },
        ],
      },
      {
        name: "Earth & Space",
        subStrands: [
          {
            name: "The Solar System",
            indicators: [
              { code: "B7.3.1.1-SC", text: "Describe the structure of the solar system and the relative positions of planets", bloomsLevel: "Remember", grade: "B7" },
              { code: "B7.3.2.1-SC", text: "Explain day and night and seasonal changes due to Earth's rotation and revolution", bloomsLevel: "Understand", grade: "B7" },
            ],
          },
        ],
      },
    ],
  },
  {
    subject: { name: "English Language", slug: "english-language" },
    strands: [
      {
        name: "Reading & Comprehension",
        subStrands: [
          {
            name: "Reading for Meaning",
            indicators: [
              { code: "B7.4.1.1-EN", text: "Identify main ideas, supporting details and implied meaning in texts", bloomsLevel: "Analyse", grade: "B7" },
              { code: "B7.4.2.1-EN", text: "Analyse the structure and purpose of different text types", bloomsLevel: "Analyse", grade: "B7" },
            ],
          },
        ],
      },
      {
        name: "Writing",
        subStrands: [
          {
            name: "Composition & Structure",
            indicators: [
              { code: "B7.5.1.1-EN", text: "Write well-structured paragraphs with topic sentences and supporting details", bloomsLevel: "Apply", grade: "B7" },
              { code: "B7.5.2.1-EN", text: "Compose informal and formal letters using appropriate tone and register", bloomsLevel: "Apply", grade: "B7" },
            ],
          },
        ],
      },
      {
        name: "Grammar & Usage",
        subStrands: [
          {
            name: "Grammar in Context",
            indicators: [
              { code: "B8.6.1.1-EN", text: "Identify and use tenses correctly in oral and written communication", bloomsLevel: "Apply", grade: "B8" },
              { code: "B8.6.2.1-EN", text: "Apply knowledge of parts of speech to improve writing accuracy", bloomsLevel: "Apply", grade: "B8" },
            ],
          },
        ],
      },
      {
        name: "Literature",
        subStrands: [
          {
            name: "Prose & Poetry",
            indicators: [
              { code: "B9.7.1.1-EN", text: "Analyse themes, characters and narrative techniques in prose fiction", bloomsLevel: "Analyse", grade: "B9" },
              { code: "B9.7.2.1-EN", text: "Interpret figurative language, imagery and tone in poetry", bloomsLevel: "Analyse", grade: "B9" },
            ],
          },
        ],
      },
    ],
  },
  {
    subject: { name: "Computing", slug: "computing" },
    strands: [
      {
        name: "Computing Systems",
        subStrands: [
          {
            name: "Hardware & Software",
            indicators: [
              { code: "B7.1.1.1-CO", text: "Identify and describe the components of a computer system and their functions", bloomsLevel: "Remember", grade: "B7" },
              { code: "B7.1.2.1-CO", text: "Distinguish between hardware and software and give examples of each", bloomsLevel: "Understand", grade: "B7" },
            ],
          },
        ],
      },
      {
        name: "Data & Information",
        subStrands: [
          {
            name: "Data Representation",
            indicators: [
              { code: "B7.2.1.1-CO", text: "Identify different types of data and explain how data is represented in binary", bloomsLevel: "Understand", grade: "B7" },
              { code: "B7.2.2.1-CO", text: "Create and format documents using word processing software", bloomsLevel: "Apply", grade: "B7" },
              { code: "B8.2.1.1-CO", text: "Use spreadsheet software to organise data, apply formulas and create charts", bloomsLevel: "Apply", grade: "B8" },
              { code: "B8.2.2.1-CO", text: "Distinguish between data and information and explain data processing", bloomsLevel: "Understand", grade: "B8" },
            ],
          },
        ],
      },
      {
        name: "Programming & Algorithms",
        subStrands: [
          {
            name: "Algorithms & Code",
            indicators: [
              { code: "B8.4.1.1-CO", text: "Design and trace algorithms using flowcharts and pseudocode", bloomsLevel: "Apply", grade: "B8" },
              { code: "B8.4.2.1-CO", text: "Write simple programs using sequence, selection and iteration in a block-based language", bloomsLevel: "Apply", grade: "B8" },
              { code: "B9.4.1.1-CO", text: "Design and implement solutions to real-world problems using a text-based programming language", bloomsLevel: "Apply", grade: "B9" },
              { code: "B9.4.2.1-CO", text: "Use functions, loops and conditionals to write structured programs", bloomsLevel: "Apply", grade: "B9" },
            ],
          },
        ],
      },
      {
        name: "Digital Citizenship",
        subStrands: [
          {
            name: "Safety & Ethics",
            indicators: [
              { code: "B8.5.1.1-CO", text: "Explain cybersecurity threats and describe ways to stay safe online", bloomsLevel: "Understand", grade: "B8" },
              { code: "B9.5.1.1-CO", text: "Analyse the social, ethical and legal issues related to computing and digital technology", bloomsLevel: "Analyse", grade: "B9" },
            ],
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding NaCCA curriculum data...");

  for (const entry of CURRICULUM) {
    // Insert subject
    const [subject] = await db
      .insert(schema.subjects)
      .values(entry.subject)
      .onConflictDoNothing()
      .returning();

    if (!subject) {
      console.log(`⚠️  Subject "${entry.subject.name}" already exists, skipping.`);
      continue;
    }

    console.log(`✅ Subject: ${subject.name}`);

    for (const strandData of entry.strands) {
      // Insert strand
      const [strand] = await db
        .insert(schema.strands)
        .values({ subjectId: subject.id, name: strandData.name })
        .returning();

      console.log(`  📂 Strand: ${strand.name}`);

      for (const subStrandData of strandData.subStrands) {
        // Insert sub-strand
        const [subStrand] = await db
          .insert(schema.subStrands)
          .values({ strandId: strand.id, name: subStrandData.name })
          .returning();

        console.log(`    📁 Sub-strand: ${subStrand.name}`);

        // Insert indicators
        for (const ind of subStrandData.indicators) {
          await db
            .insert(schema.indicators)
            .values({
              subStrandId: subStrand.id,
              code: ind.code,
              text: ind.text,
              bloomsLevel: ind.bloomsLevel,
              grade: ind.grade,
            })
            .onConflictDoNothing();

          console.log(`      🔖 ${ind.code}: ${ind.text.slice(0, 50)}...`);
        }
      }
    }
  }

  console.log("\n✅ Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});