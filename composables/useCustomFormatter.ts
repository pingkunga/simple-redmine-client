export default () => {
    const customYYYYMMDDDateFormatter = {
        date: (val:string) => {
          if (!val) return null;
          const date = new Date(val);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          return `${year}-${month}-${day}`;
        },
      };


    return {
        customYYYYMMDDDateFormatter
    };
}