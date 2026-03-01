const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed all 9 condition formula steps in Romanian.
 * Source: Hubbard ESTO Series / live system data.
 */
const CONDITION_STEPS = {
    putere: [
        { step: 1, text: 'Nu te deconecta. Prima responsabilitate a unei persoane în condiția de Putere este să nu se deconecteze.' },
        { step: 2, text: 'Notează-ți în scris toate responsabilitățile postului tău.' },
        { step: 3, text: 'Fă o listă completă a tuturor documentelor și dosarelor esențiale.' },
        { step: 4, text: 'Predă cu succes și complet postul tău succesorului.' },
    ],
    schimbare_putere: [
        { step: 1, text: 'Nu schimba nimic.' },
        { step: 2, text: 'Nu emite ordine noi.' },
        { step: 3, text: 'Învață liniile de comunicare existente.' },
        { step: 4, text: 'Observă ce funcționa bine sub conducerea anterioară și continuă exact la fel.' },
    ],
    abundenta: [
        { step: 1, text: 'Economisește. Primul lucru de făcut în cazul Abundenței este să economisești, apoi să ai mare grijă să nu cumperi nimic ce implică vreo obligație viitoare.' },
        { step: 2, text: 'Plătește toate facturile. Caută toate facturile pe care le poți găsi oriunde; fiecare ban pe care îl datorezi cuiva, și plătește-le.' },
        { step: 3, text: 'Investește restul în echipamente de serviciu. Fă posibilă furnizarea de servicii.' },
        { step: 4, text: 'Descoperă ce a cauzat starea de Abundență și întărește acel lucru.' },
    ],
    normal: [
        { step: 1, text: 'Nu schimba nimic. Menținem o creștere atunci când suntem în starea de funcționare Normală, prin faptul că nu schimbăm nimic.' },
        { step: 2, text: 'Etica este foarte ușoară. Factorul de justiție este destul de blând și destul de moderat.' },
        { step: 3, text: 'De fiecare dată când o statistică se îmbunătățește, examinează cu atenție și descoperă ce a îmbunătățit-o. Și apoi fă acel lucru, fără a renunța la ceea ce făceai înainte.' },
        { step: 4, text: 'De fiecare dată când o statistică scade ușor, găsește rapid cauza și corectează situația.' },
    ],
    urgenta: [
        { step: 1, text: 'Promovează. Aceasta se aplică unei organizații. Pentru individ ar trebui să spunem „produce". Acesta este primul lucru de făcut, indiferent de orice altceva.' },
        { step: 2, text: 'Schimbă-ți baza de operare. Dacă ai intrat în starea de Urgență și apoi nu ți-ai schimbat modul de operare după promovare, te vei îndrepta către o altă stare de Urgență.' },
        { step: 3, text: 'Economisește.' },
        { step: 4, text: 'Pregătește-te pentru furnizarea de servicii.' },
        { step: 5, text: 'Înăsprește disciplina. O parte din starea de Urgență conține această directivă scurtă: „trebuie să înăsprești disciplina", respectiv „trebuie să înăsprești etica".' },
    ],
    pericol_conducere: [
        { step: 1, text: 'Ocolește (ignoră subordonatul sau subordonații care în condiții normale sunt responsabili de această activitate și ocupă-te personal de situație).' },
        { step: 2, text: 'Gestionează situația și orice pericol conținut de ea.' },
        { step: 3, text: 'Atribuie starea de Pericol zonei în care a trebuit gestionată situația.' },
        { step: 4, text: 'Atribuie starea de Pericol pe prima dinamică fiecărei persoane legate de starea de Pericol, și fă obligatorie și asigură-te că formula este urmată integral. Dacă nu o fac, efectuează o investigație etică completă.' },
        { step: 5, text: 'Reorganizează activitatea astfel încât situația să nu se repete.' },
        { step: 6, text: 'Recomandă orice politică fermă care de acum înainte va detecta starea și/sau va preveni reapariția ei.' },
    ],
    pericol_personal: [
        { step: 1, text: 'Ocolește obiceiurile și acțiunile de rutină zilnice.' },
        { step: 2, text: 'Gestionează situația și orice pericol conținut de ea.' },
        { step: 3, text: 'Atribuie-ți ție personal starea de Pericol.' },
        { step: 4, text: 'Pune-ți în ordine propria etică personală, descoperind ce faci neetic și practică autodisciplină pentru a corecta acest lucru; devino onest și integru.' },
        { step: 5, text: 'Reorganizează-ți viața astfel încât să nu ți se mai întâmple în mod constant situația periculoasă.' },
        { step: 6, text: 'Formulează și începe să urmezi o politică fermă care de acum înainte va detecta această situație și va preveni reapariția ei.' },
    ],
    non_existenta: [
        { step: 1, text: 'Găsește o linie de comunicare.' },
        { step: 2, text: 'Fă-te cunoscut.' },
        { step: 3, text: 'Descoperă ce este necesar și dorit.' },
        { step: 4, text: 'Fă, produce și/sau furnizează acel lucru.' },
    ],
    non_existenta_extinsa: [
        { step: 1, text: 'Identifică toate liniile de comunicare pe care va trebui să le utilizezi pentru a oferi și a primi informații legate de sarcinile și echipamentele tale și înscrie-te pe toate acestea.' },
        { step: 2, text: 'Fă-te cunoscut alături de numele postului tău și sarcinile tale tuturor terminalelor de la care va trebui să primești informații și să furnizezi date.' },
        { step: 3, text: 'Descoperă de la superiorii, colegii și publicul tău, de la toți cu care ar putea fi necesar să intri în contact în cursul îndeplinirii sarcinilor tale, ce este necesar și de dorit separat pentru fiecare.' },
        { step: 4, text: 'Fă, produce și furnizează ceea ce consideră separat necesar și de dorit, în conformitate cu politica.' },
        { step: 5, text: 'Menține liniile de comunicare existente și extinde-le în mod regulat pentru a primi informații suplimentare față de cele pe care le consideri acum că au nevoie de informații.' },
        { step: 6, text: 'Menține-ți liniile de originație pentru a-i informa pe alții despre exact ce faci, dar numai pe cei care au cu adevărat nevoie de informații.' },
        { step: 7, text: 'Fă mai lin și mai eficient ceea ce faci, produci și furnizezi, pentru a corespunde mai precis a ceea ce este cu adevărat necesar și de dorit.' },
        { step: 8, text: 'Oferind și primind informații complete cu privire la produsele tale, produce, creează și furnizează în mod regulat un produs mult îmbunătățit la postul tău.' },
    ],
};

async function seedConditionSteps() {
    console.log('Seeding condition formula steps...');
    let count = 0;
    for (const [conditionType, steps] of Object.entries(CONDITION_STEPS)) {
        for (const { step, text } of steps) {
            await prisma.conditionFormulaStep.upsert({
                where: {
                    conditionType_stepNumber_language: {
                        conditionType,
                        stepNumber: step,
                        language: 'ro',
                    },
                },
                update: { stepText: text },
                create: {
                    conditionType,
                    stepNumber: step,
                    stepText: text,
                    language: 'ro',
                },
            });
            count++;
        }
    }
    console.log(`  ✅ ${count} steps seeded for ${Object.keys(CONDITION_STEPS).length} condition types`);
}

module.exports = { seedConditionSteps, CONDITION_STEPS };

// Run directly if called as script
if (require.main === module) {
    seedConditionSteps()
        .then(() => console.log('Done!'))
        .catch(err => console.error(err))
        .finally(() => prisma.$disconnect());
}
