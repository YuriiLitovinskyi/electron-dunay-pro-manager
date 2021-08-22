const findEmplStat = `
SELECT * FROM EMPLOYEE INNER JOIN
(SELECT EMPL_T.ID AS ID,
        EMPL_T.OID AS OID, 
        EMPL_T.NAME AS EMPLOYEE_NAME,
        CAST(EMPL_T.DESCRIPTION as blob sub_type text character set binary) AS EMPLOYEE_DESCRIPTION,
        STAFF_T.NAME AS STAFF_NAME,
        CAST(STAFF_T.DESCRIPTION as blob sub_type text character set binary) AS STAFF_DESCRIPTION,
        PLACE_T.NAME AS PLACE_NAME,
        CAST(PLACE_T.DESCRIPTION as blob sub_type text character set binary) AS PLACE_DESCRIPTION,
        OBJ_T.name AS OBJ_NAME, 
        OBJ_T.OID AS OBJ_NUMBER,
        CAST(OBJ_T.DESCRIPTION as blob sub_type text character set binary) AS OBJ_DESCRIPTION
        FROM
            (SELECT * FROM OBJECTS WHERE CLASS_NAME = 'EMPLOYEE') AS EMPL_T
INNER JOIN  objects as STAFF_T
    ON EMPL_T.PARENT_ID = STAFF_T.ID
INNER JOIN OBJECTS AS PLACE_T
    ON STAFF_T.PARENT_ID = PLACE_T.ID
INNER JOIN OBJECTS AS OBJ_T
    ON PLACE_T.PARENT_ID = OBJ_T.ID) AS OBJECTS
ON EMPLOYEE.ID = OBJECTS.ID ORDER BY OID ASC, OBJECTS.ID DESC;`

// const findEmplStat = `
// SELECT ADDRESS, CAST(ADDRESS as blob sub_type text character set binary) AS try_convert_5 FROM EMPLOYEE;
// `

module.exports = {
    findEmplStat
}