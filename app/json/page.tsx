export default async function Page() {
    let data = await fetch('https://jsonplaceholder.typicode.com/posts');
    let obj = await data.json();
    return (
        <h1>
{JSON.stringify(obj)}
        </h1>
    );
}